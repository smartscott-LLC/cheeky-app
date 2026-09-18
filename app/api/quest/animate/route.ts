import { NextResponse } from 'next/server';

// Retry helper with 10s flat backoff for queue-full errors
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isQueueFull =
        err?.message?.includes('queue') ||
        err?.code === 'video_queue_full' ||
        err?.status === 503;
      if (!isQueueFull || i === maxRetries - 1) throw err;
      const delay = 10000; // 10s flat retry
      console.log(
        `[Animate] Queue full, retry ${i + 1}/${maxRetries} in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ===== API Keys — priority order: TOKEN → ENTERPRISE → FREE =====
const AGNES_TOKEN_KEY = process.env.AGNES_TOKEN_MODEL_API_KEY || '';
const AGNES_ENTERPRISE_KEY = process.env.AGNES_ENTERPRISE_KEY || '';
const AGNES_FREE_KEY = process.env.AGNES_FREE_API_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      prompt,
      duration = 4
    } = body as {
      imageUrl: string;
      prompt?: string;
      duration?: number;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const videoPrompt =
      prompt ||
      `A Pixar/Disney style 3D animated character portrait spinning slowly in a full 360-degree circle for two complete rotations over approximately 4 seconds. The character turns smoothly showing all angles — front, left side, back, right side, front again. Cinematic lighting, pure dark background, smooth rotation, Pixar-quality animation, character identity stays consistent throughout the spin.`;

    // Agnes key priority: TOKEN → ENTERPRISE → FREE
    const agnesKeys = [
      { key: AGNES_TOKEN_KEY, label: 'token' },
      { key: AGNES_ENTERPRISE_KEY, label: 'enterprise' },
      { key: AGNES_FREE_KEY, label: 'free' }
    ].filter((k) => k.key);

    let videoResult: any = null;
    let usedProvider = 'none';

    // Try each Agnes key in priority order
    for (const { key, label } of agnesKeys) {
      try {
        const createData = await withRetry(async () => {
          const createResp = await fetch(
            'https://apihub.agnes-ai.com/v1/videos',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'agnes-video-2.5-flash',
                prompt: videoPrompt,
                image: imageUrl,
                seconds: duration,
                mode: 'keyframe',
                size: '720P',
                aspect_ratio: '16:9'
              })
            }
          );

          if (!createResp.ok) {
            const errText = await createResp.text().catch(() => '');
            // Re-throw queue-full errors
            if (createResp.status === 503 && errText.includes('queue')) {
              throw Object.assign(
                new Error(`Agnes ${label} video queue full`),
                { code: 'video_queue_full' }
              );
            }
            console.log(
              `[Video] Agnes ${label} create failed (${createResp.status}): ${errText.slice(0, 200)}`
            );
            throw new Error(
              `Agnes ${label} create failed: ${createResp.status}`
            );
          }

          const data = await createResp.json();
          if (!data.video_id && !data.id)
            throw new Error('No video_id in response');
          return data;
        }, 5);

        const videoId = createData.video_id || createData.id;
        if (!videoId) continue;

        // Poll for completion via /agnesapi?video_id=...
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusResp = await fetch(
            `https://apihub.agnes-ai.com/agnesapi?video_id=${videoId}&model_name=agnes-video-2.5-flash`,
            { headers: { Authorization: `Bearer ${key}` } }
          );

          if (!statusResp.ok) {
            console.log(
              `[Video] Agnes ${label} poll failed (${statusResp.status})`
            );
            break;
          }

          const status = await statusResp.json();

          if (status.status === 'completed') {
            videoResult = status;
            usedProvider = `Agnes(${label})`;
            break;
          }
          if (status.status === 'failed') {
            throw new Error(status.error?.message || 'Video generation failed');
          }
          // queued / in_progress — keep polling
        }

        if (videoResult) break;
      } catch (agnesErr) {
        console.log(
          `[Video] Agnes ${label} exception after retries:`,
          agnesErr
        );
      }
    }

    if (!videoResult) {
      throw new Error(
        'Video generation failed — all Agnes keys exhausted or queued'
      );
    }

    // Agnes v2.0 returns url under metadata.url
    const videoUrl =
      (videoResult as any).metadata?.url ||
      (videoResult as any).url ||
      ((videoResult as any).data?.[0] as any)?.url;
    const videoId =
      (videoResult as any).id || (videoResult as any).video_id || null;

    if (!videoUrl) throw new Error('No video URL in response');

    return NextResponse.json({
      success: true,
      videoUrl,
      videoId,
      provider: usedProvider
    });
  } catch (error) {
    console.error('Animation generation error:', error);
    return NextResponse.json(
      {
        error: 'Animation failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
