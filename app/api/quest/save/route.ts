import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { config, imageUrl, name, rpgClass, generationType } = body as {
      config: Record<string, unknown>; imageUrl: string; name: string; rpgClass: string; generationType: string;
    };

    const id = crypto.randomUUID();
    const avatarDoc = {
      id,
      name: name || 'Unnamed Hero',
      rpg_class: rpgClass || 'adventurer',
      generation_type: generationType || 'manual',
      config: config || {},
      image_url: imageUrl || null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/avatars`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(avatarDoc),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase save failed: ${err}`);
    }

    return NextResponse.json({ success: true, id, name: avatarDoc.name });
  } catch (error) {
    console.error('Save avatar error:', error);
    return NextResponse.json(
      { error: 'Save failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
