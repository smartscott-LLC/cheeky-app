import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1',
    })
  : null;

const AI_MODEL = process.env.OPENROUTER_AI_MODEL || 'bytedance-seed/seedream-5-0-lite';
const AGNES_ENTERPRISE = process.env.AGNES_ENTERPRISE_KEY || '';
const AGNES_TOKEN = process.env.AGNES_TOKEN_MODEL_API_KEY || '';
const AGNES_IMAGE_MODEL = process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.5-flash';

// ===== Prompt Builders =====
function buildManualPrompt(config: Record<string, unknown>) {
  const { gender, skinTone, hairStyle, hairColor, eyeColor, build, outfit, personality, name, top, bottom, shoes, accessories, tattoos, hat } = config as typeof config & Record<string, unknown>;

  const hairLabels: Record<string, string> = {
    short_crop: 'short crop', fade: 'stylish high fade', curly: 'curly natural hair',
    waves: 'flowing wave hairstyle', mohawk: 'bold mohawk', bald: 'shaved bald head',
    messy: 'tousled messy hair', locs: 'beautiful dreadlocks',
    long_straight: 'long flowing straight hair', wavy_bob: 'wavy bob cut',
    high_ponytail: 'high ponytail', braids: 'intricately braided hair',
    pixie: 'chic pixie cut', updo: 'elegant updo hairstyle',
  };

  const outfitLabels: Record<string, string> = {
    casual: 'stylish casual streetwear with modern trendy elements',
    smart: 'smart business casual attire with crisp collar',
    athletic: 'sporty athletic wear, dynamic and energetic',
    elegant: 'elegant sophisticated evening wear',
    fantasy: 'heroic fantasy RPG armor with magical golden accents',
  };

  const classVibes: Record<string, string> = {
    romantic: 'warm radiant smile, charming romantic aura with soft golden light',
    adventurer: 'bold confident expression, determined eyes of a fearless explorer',
    scholar: 'intelligent thoughtful look, intellectual curiosity in the eyes',
    mystic: 'mysterious ethereal presence, knowing gaze with magical energy',
    champion: 'strong noble bearing, heroic presence and protective confidence',
  };

  const genderLabel = gender === 'male' ? 'Young man' : 'Young woman';
  const skinToneStr = skinTone || 'medium';
  const hairStyleStr = hairStyle as string;
  const hairStyleLabel = hairLabels[hairStyleStr] || hairStyleStr || 'short';
  const hairColorStr = hairColor || 'dark';
  const eyeColorStr = eyeColor || 'brown';
  const buildStr = build || 'athletic';
  const outfitStr = outfit as string;
  const outfitLabel = outfitLabels[outfitStr] || 'casual stylish outfit';
  const personalityStr = personality as string;
  const classVibe = classVibes[personalityStr] || 'warm, charming, confident';
  const topDesc = top || 'stylish fitted tee';
  const bottomDesc = bottom || 'fitted dark jeans';
  const shoesDesc = shoes || 'clean white sneakers';
  const accessoriesArr = accessories as string[];
  const tattooArr = tattoos as string[];
  const accessoryStr = accessoriesArr?.length
    ? `Wearing ${accessoriesArr.join(', ')}.`
    : 'No visible accessories.';
  const tattooDesc = tattooArr?.[0] && tattooArr?.[0] !== 'none'
    ? `Adorned with a tasteful ${tattooArr[0]} tattoo.`
    : 'Smooth, unmarked skin.';
  const hatDesc = hat ? `Wearing a ${hat}.` : '';
  const nameStr = name;

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
- Head and shoulders portrait, face perfectly centered and lit, heroic stance
- Cinematic lighting: warm golden rim light + soft cyan fill light = magical glow
- Deep purple/navy bokeh background with floating magical particles
- Rich jewel-tone colors, ultra high detail
- Warm confident inviting expression — this hero is on a quest for love
- No text, no watermarks, no logos, single character only, 4K quality`;
}

function buildAIPrompt(description: string) {
  return `Create a breathtaking Pixar/Disney animated movie quality 3D character portrait for a fantasy RPG dating adventure game called "Quest for Love."

Character description: "${description}"

Art direction (CRITICAL):
- Pixar/Disney 3D animated film quality — smooth luminous skin, expressive sparkling eyes
- Head and shoulders portrait, face perfectly centered
- Cinematic lighting: warm golden rim light + soft cyan fill light
- Deep purple bokeh background with magical floating particles
- Rich jewel-tone colors, ultra high detail, vibrant
- Warm confident charming expression — a hero seeking love
- No text, no watermarks, no logos, single character, 4K quality`;
}

// ===== Route Handler =====
export async function POST(request: Request) {
  const agnesEnterpriseKey = AGNES_ENTERPRISE;
  const agnesTokenKey = AGNES_TOKEN;
  const provider = agnesEnterpriseKey ? 'Agnes' : 'OpenRouter';

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
      config = body.config as Record<string, unknown> || null;
      description = body.description as string | null;
    }

    const prompt = config
      ? buildManualPrompt(config)
      : buildAIPrompt(description || 'A charming, attractive person ready for adventure');

    let result: { data: Array<{ b64_json?: string; url?: string }> } | null = null;
    let usedProvider = provider;

    // Try Agnes first
    try {
      const agnesKey = agnesEnterpriseKey || agnesTokenKey;
      if (agnesKey) {
        let agnesBody: Record<string, unknown> = { model: AGNES_IMAGE_MODEL, prompt, n: 1 };
        if (photoFile) {
          const photoBuffer = await photoFile.arrayBuffer();
          const photoBase64 = Buffer.from(photoBuffer).toString('base64');
          agnesBody.image = `data:${photoFile.type};base64,${photoBase64}`;
        }

        const agnesImgResp = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agnesKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agnesBody),
        });

        if (agnesImgResp.ok) {
          const agnesImgResult = await agnesImgResp.json();
          if (agnesImgResult.data?.[0]) {
            result = { data: [agnesImgResult.data[0]] };
            usedProvider = 'Agnes';
          }
        }
      }
    } catch (agnesErr) {
      console.log('[Avatar] Agnes failed:', agnesErr);
    }

    // Fall back to OpenRouter
    if (!result || !(result as any).data?.[0]) {
      if (!openai) throw new Error('No image generation provider configured');
      try {
        let openResult: any;
        if (photoFile) {
          openResult = await openai.images.edit({
            model: AI_MODEL, image: photoFile, prompt, n: 1, quality: 'medium',
          });
        } else {
          openResult = await openai.images.generate({ model: AI_MODEL, prompt, n: 1, quality: 'high' });
        }
        result = openResult;
        usedProvider = 'OpenRouter';
      } catch (openaiErr) {
        throw new Error(`Both providers failed: Agnes(early error), OpenRouter(${openaiErr})`);
      }
    }

    const imageData = result?.data?.[0];
    if (!imageData) throw new Error('No image data in response');

    const imageUrl = imageData.b64_json
      ? `data:image/png;base64,${imageData.b64_json}`
      : imageData.url;

    if (!imageUrl) throw new Error('No image URL returned');

    return NextResponse.json({ success: true, imageUrl, provider: usedProvider });

  } catch (error) {
    console.error('Avatar generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
