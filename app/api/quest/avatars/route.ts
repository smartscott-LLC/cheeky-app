import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ avatars: [] });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/avatars?user_id=eq.${userId}&order=created_at.desc&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ avatars: [] });
    }

    const avatars = await res.json();
    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('Fetch quest avatars error:', error);
    return NextResponse.json({ avatars: [] });
  }
}
