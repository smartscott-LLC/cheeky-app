import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  uploadAsset,
  setAvatar,
  setAvatarMeta,
  getManifest
} from '@/utils/quest-storage';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { config, imageUrl, name, rpgClass, generationType } = body as {
      config: Record<string, unknown>;
      imageUrl: string;
      name: string;
      rpgClass: string;
      generationType: string;
    };

    // Extract user ID from Supabase auth cookie
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabaseKey = cookieStore.get(
        'sb-ioqeddpgdilyyajsygmz-auth-token'
      )?.value;
      if (supabaseKey) {
        const payload = JSON.parse(atob(supabaseKey.split('.')[1]));
        userId = payload.sub || null;
      }
    } catch {}

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Download image and upload to user's manifest folder
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to download image');
    const imgBuffer = await imgRes.arrayBuffer();
    const imgMimeType = imgRes.headers.get('content-type') || 'image/png';

    const savedImageUrl = await uploadAsset(
      userId,
      'avatar.png',
      imgBuffer,
      imgMimeType
    );

    // Update manifest
    await setAvatar(userId, 'image', savedImageUrl);
    await setAvatarMeta(userId, {
      name,
      rpgClass,
      generationType: generationType as 'manual' | 'ai',
      config
    });

    // Also save to avatars table for queryability
    const id = crypto.randomUUID();
    const avatarDoc = {
      id,
      user_id: userId,
      name: name || 'Unnamed Hero',
      rpg_class: rpgClass || 'adventurer',
      generation_type: generationType || 'manual',
      config: config || {},
      image_url: savedImageUrl
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/avatars`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(avatarDoc)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('DB save failed:', err);
    }

    // Fetch updated manifest to return
    const manifest = await getManifest(userId);

    return NextResponse.json({
      success: true,
      id,
      name: avatarDoc.name,
      manifestUrl: manifest.userId // client can refetch
    });
  } catch (error) {
    console.error('Save avatar error:', error);
    return NextResponse.json(
      {
        error: 'Save failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
