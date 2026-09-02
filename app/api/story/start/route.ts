import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { startStory } from '@/utils/story/server';

export async function POST() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const progress = await startStory();
  if (!progress) {
    return NextResponse.json({ error: 'failed to start story' }, { status: 500 });
  }

  return NextResponse.redirect(new URL('/story', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
}