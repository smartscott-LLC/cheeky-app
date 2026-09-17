import { NextResponse } from 'next/server';

const AGNES_ENTERPRISE = process.env.AGNES_ENTERPRISE_KEY || '';
const AGNES_TOKEN = process.env.AGNES_TOKEN_MODEL_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const VIDEO_MODEL = process.env.OPENROUTER_VIDEO_MODEL || 'bytedance/seedance-2.0-mini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, prompt, duration = 4, resolution = '720p' } = body as {
      imageUrl: string; prompt?: string; duration?: number; resolution?: string;
    };

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const videoPrompt = prompt || `A 3D animated character portrait spinning slowly in a full 360-degree circle, Pixar/Disney style, cinematic lighting, pure dark background, smooth rotation showing all angles`;

    let videoResult: { id?: string; url?: string; status?: string } | null = null;
    let usedProvider = 'none';

    // Try Agnes first
    const apiKey = AGNES_ENTERPRISE || AGNES_TOKEN;
    if (apiKey) {
      try {
        const agnesResp = await fetch('https://apihub.agnes-ai.com/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'agnes-video-v2.0',
            prompt: videoPrompt,
            image: imageUrl,
            duration,
          }),
        });

        if (agnesResp.ok) {
          const result = await agnesResp.json();
          if (result.id) {
            for (let i = 0; i < 30; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const statusResp = await fetch(`https://apihub.agnes-ai.com/agnesapi?video_id=${result.id}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` },
              });
              if (statusResp.ok) {
                const status = await statusResp.json();
                if (status.status === 'completed' || status.url) {
                  videoResult = status;
                  usedProvider = 'Agnes';
                  break;
                }
                if (status.status === 'failed' || status.error) {
                  throw new Error(status.error?.message || 'Video generation failed');
                }
              }
            }
          }
        }
      } catch (agnesErr) {
        console.log('[Video] Agnes failed:', agnesErr);
      }
    }

    // Fall back to OpenRouter
    if (!videoResult && OPENROUTER_KEY) {
      try {
        const createResponse = await fetch('https://openrouter.ai/api/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Cheeky Quest',
          },
          body: JSON.stringify({
            model: VIDEO_MODEL,
            prompt: videoPrompt,
            image: imageUrl,
            duration,
            resolution,
          }),
        });

        if (createResponse.ok) {
          const result = await createResponse.json();
          if (result.id) {
            const pollingUrl = result.polling_url || `https://openrouter.ai/api/v1/videos/${result.id}`;
            for (let i = 0; i < 30; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const statusResp = await fetch(pollingUrl, {
                headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` },
              });
              if (statusResp.ok) {
                const status = await statusResp.json();
                if (status.status === 'completed' || status.status === 'succeeded') {
                  videoResult = status;
                  usedProvider = 'OpenRouter';
                  break;
                }
                if (status.status === 'failed' || status.status === 'error') {
                  throw new Error(status.error?.message || 'Video generation failed');
                }
              }
            }
          }
        }
      } catch (orErr) {
        console.log('[Video] OpenRouter failed:', orErr);
      }
    }

    if (!videoResult) {
      throw new Error('Video generation failed with all providers');
    }

    const videoUrl = (videoResult as any).url || ((videoResult as any).data?.[0]?.url as string | undefined);
    if (!videoUrl) throw new Error('No video URL in response');

    return NextResponse.json({ success: true, videoUrl, videoId: videoResult.id, provider: usedProvider });
  } catch (error) {
    console.error('Animation generation error:', error);
    return NextResponse.json(
      { error: 'Animation failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
