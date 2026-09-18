import { NextResponse } from 'next/server';

// ===== API Keys — priority order: TOKEN → ENTERPRISE → FREE =====
const AGNES_TOKEN_KEY = process.env.AGNES_TOKEN_MODEL_API_KEY || '';
const AGNES_ENTERPRISE_KEY = process.env.AGNES_ENTERPRISE_KEY || '';
const AGNES_FREE_KEY = process.env.AGNES_FREE_API_KEY || '';

// ===== Prompt Builders =====
function buildManualPrompt(config: Record<string, unknown>) {
  const gender = config.gender as string;
  const skinTone = config.skinTone as string;
  const hairStyle = config.hairStyle as string;
  const hairColor = config.hairColor as string;
  const eyeColor = config.eyeColor as string;
  const build = config.build as string;
  const outfit = config.outfit as string;
  const personality = config.personality as string;
  const name = config.name as string;
  const top = config.top as string;
  const _bottom = config.bottom as string;
  const _shoes = config.shoes as string;
  const accessories = config.accessories as string[];
  const tattoos = config.tattoos as string[];
  const hat = config.hat as string;

  const hairLabels: Record<string, string> = {
    short_crop: 'short crop',
    fade: 'stylish high fade',
    curly: 'curly natural hair',
    waves: 'flowing wave hairstyle',
    mohawk: 'bold mohawk',
    bald: 'shaved bald head',
    messy: 'tousled messy hair',
    locs: 'beautiful dreadlocks',
    long_straight: 'long flowing straight hair',
    wavy_bob: 'wavy bob cut',
    high_ponytail: 'high ponytail',
    braids: 'intricately braided hair',
    pixie: 'chic pixie cut',
    updo: 'elegant updo hairstyle'
  };

  const outfitLabels: Record<string, string> = {
    casual: 'stylish casual streetwear with modern trendy elements',
    smart: 'smart business casual attire with crisp collar',
    athletic: 'sporty athletic wear, dynamic and energetic',
    elegant: 'elegant sophisticated evening wear',
    fantasy: 'heroic fantasy RPG armor with magical golden accents'
  };

  const classVibes: Record<string, string> = {
    romantic:
      'warm radiant smile, charming romantic aura with soft golden light',
    adventurer:
      'bold confident expression, determined eyes of a fearless explorer',
    scholar: 'intelligent thoughtful look, intellectual curiosity in the eyes',
    mystic: 'mysterious ethereal presence, knowing gaze with magical energy',
    champion: 'strong noble bearing, heroic presence and protective confidence'
  };

  const genderLabel = gender === 'male' ? 'Young man' : 'Young woman';
  const skinToneStr = String(skinTone || 'medium');
  const hairStyleStr = String(hairStyle);
  const hairStyleLabel = hairLabels[hairStyleStr] || hairStyleStr || 'short';
  const hairColorStr = String(hairColor || 'dark');
  const eyeColorStr = String(eyeColor || 'brown');
  const buildStr = String(build || 'athletic');
  const outfitStr = String(outfit);
  const outfitLabel = outfitLabels[outfitStr] || 'casual stylish outfit';
  const personalityStr = String(personality);
  const classVibe = classVibes[personalityStr] || 'warm, charming, confident';
  const topDesc = String(top || 'stylish fitted tee');
  const bottomDesc = String(_bottom || 'fitted dark jeans');
  const shoesDesc = String(_shoes || 'clean white sneakers');
  const accessoriesArr = Array.isArray(accessories)
    ? (accessories as string[])
    : [];
  const tattooArr = Array.isArray(tattoos) ? (tattoos as string[]) : [];
  const accessoryStr = accessoriesArr?.length
    ? `Wearing ${accessoriesArr.join(', ')}.`
    : 'No visible accessories.';
  const tattooDesc =
    tattooArr?.[0] && tattooArr?.[0] !== 'none'
      ? `Adorned with a tasteful ${tattooArr[0]} tattoo.`
      : 'Smooth, unmarked skin.';
  const hatDesc = hat ? `Wearing a ${String(hat)}.` : '';
  const nameStr = String(name || '');

  return `Create a breathtaking Pixar/Disney animated movie quality 3D character portrait for a fantasy RPG dating adventure game called "Quest for Love."

Character:
- ${genderLabel} ${skinToneStr} skin tone
- ${hairStyleLabel} hairstyle in ${hairColorStr} color
- ${eyeColorStr} eyes, ${buildStr} physique
- Wearing a ${topDesc}, ${bottomDesc}, and ${shoesDesc}
- ${outfitLabel}
- ${accessoryStr} ${hatDesc} ${tattooDesc}
- Personality: ${classVibe}
${nameStr ? `- Hero name: ${nameStr}` : ''}

Art direction (CRITICAL):
- Pixar/Disney 3D animated film quality — smooth luminous skin, expressive sparkling eyes, vibrant saturated colors
- Full body portrait, character centered and fully visible from head to toe
- Cinematic lighting: warm golden rim light + soft cyan fill light = magical glow
- Deep purple/navy bokeh background with floating magical particles
- Rich jewel-tone colors, ultra high detail
- Warm confident inviting expression — this hero is on a quest for love
- No text, no watermarks, no logos, single character only, 4K quality
- UNIQUE CHARACTER: this portrait must be one-of-a-kind, never seen before`;
}

function buildAIPrompt(description: string) {
  return `Create a breathtaking Pixar/Disney animated movie quality 3D character portrait for a fantasy RPG dating adventure game called "Quest for Love."

Character description: "${description}"

Art direction (CRITICAL):
- Pixar/Disney 3D animated film quality — smooth luminous skin, expressive sparkling eyes
- Full body portrait, character centered and fully visible from head to toe
- Cinematic lighting: warm golden rim light + soft cyan fill light
- Deep purple bokeh background with magical floating particles
- Rich jewel-tone colors, ultra high detail, vibrant
- Warm confident charming expression — a hero seeking love
- No text, no watermarks, no logos, single character, 4K quality
- UNIQUE CHARACTER: this portrait must be one-of-a-kind, never seen before`;
}

// Retry helper with 10s flat backoff for queue-full errors
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isQueueFull =
        err?.message?.includes('queue') || err?.status === 503;
      if (!isQueueFull || i === maxRetries - 1) throw err;
      const delay = 10000; // 10s flat retry
      console.log(
        `[Generate] Queue full, retry ${i + 1}/${maxRetries} in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Agnes image API call with fallback chain and queue retry
async function tryAgnesImage(
  prompt: string,
  photoFile: File | null,
  freeKey: string,
  enterpriseKey: string,
  tokenKey: string
) {
  const keys = [
    { key: tokenKey, label: 'token' },
    { key: enterpriseKey, label: 'enterprise' },
    { key: freeKey, label: 'free' }
  ].filter((k) => k.key);

  for (const { key, label } of keys) {
    try {
      const result = await withRetry(async () => {
        const body: Record<string, unknown> = {
          model: 'agnes-image-2.5-flash',
          prompt,
          size: '1K',
          ratio: '1:1'
        };

        if (photoFile) {
          const photoBuffer = await photoFile.arrayBuffer();
          const photoBase64 = Buffer.from(photoBuffer).toString('base64');
          body.extra_body = {
            image: [`data:${photoFile.type};base64,${photoBase64}`],
            response_format: 'url'
          };
        } else {
          body.extra_body = { response_format: 'url' };
        }

        const resp = await fetch(
          'https://apihub.agnes-ai.com/v1/images/generations',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          // Re-throw queue-full errors so retry logic handles them
          if (resp.status === 503 && errText.includes('queue')) {
            throw Object.assign(new Error(`Agnes ${label} queue full`), {
              status: 503
            });
          }
          console.log(
            `[Avatar] Agnes ${label} failed (${resp.status}): ${errText.slice(0, 200)}`
          );
          throw new Error(`Agnes ${label} failed: ${resp.status}`);
        }

        const data = await resp.json();
        if (data.data?.[0]?.b64_json) {
          return {
            data: [{ b64_json: data.data[0].b64_json }],
            provider: `Agnes(${label})`
          };
        }
        if (data.data?.[0]?.url) {
          return {
            data: [{ url: data.data[0].url }],
            provider: `Agnes(${label})`
          };
        }
      }, 5);

      if (result) return result;
    } catch (err) {
      console.log(`[Avatar] Agnes ${label} exception after retries:`, err);
    }
  }
  return null;
}

// ===== Route Handler =====
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let config: Record<string, unknown> | null = null;
    let description: string | null = null;
    let photoFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const type = formData.get('type');
      if (type === 'ai') {
        description = (formData.get('description') as string) || '';
        const photo = formData.get('photo');
        if (photo && photo instanceof File && photo.size > 0) photoFile = photo;
      } else {
        const configStr = formData.get('config');
        if (configStr) config = JSON.parse(configStr as string);
      }
    } else {
      const body = await request.json();
      config = (body.config as Record<string, unknown>) || null;
      description = body.description as string | null;
    }

    const prompt = config
      ? buildManualPrompt(config)
      : buildAIPrompt(
          description || 'A charming, attractive person ready for adventure'
        );

    // Try Agnes (TOKEN → ENTERPRISE → FREE) with queue retry
    const agnesResult = await tryAgnesImage(
      prompt,
      photoFile,
      AGNES_TOKEN_KEY,
      AGNES_ENTERPRISE_KEY,
      AGNES_FREE_KEY
    );
    if (!agnesResult)
      throw new Error('Agnes generation failed — all keys exhausted or queued');
    const imageData = agnesResult.data[0] as any;
    const externalUrl = imageData.url;
    if (!externalUrl) throw new Error('No image URL in Agnes response');
    return NextResponse.json({
      success: true,
      imageUrl: externalUrl,
      provider: agnesResult.provider
    });
  } catch (error) {
    console.error('Avatar generation error:', error);
    return NextResponse.json(
      {
        error: 'Generation failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
