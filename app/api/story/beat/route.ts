import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { completeBeat } from '@/utils/story/server';
import { STORY_BEATS } from '@/utils/story/beats';

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  let body: { beatNumber?: number; choiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { beatNumber, choiceId } = body;
  if (!beatNumber || !choiceId) {
    return NextResponse.json(
      { error: 'beatNumber and choiceId required' },
      { status: 400 }
    );
  }

  const beat = STORY_BEATS.find((b) => b.number === beatNumber);
  if (!beat) {
    return NextResponse.json({ error: 'beat not found' }, { status: 404 });
  }

  const choice = beat.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return NextResponse.json({ error: 'choice not found' }, { status: 404 });
  }

  const progress = await completeBeat(beatNumber, choiceId);
  if (!progress) {
    return NextResponse.json(
      { error: 'failed to record beat' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    score: progress.current_score,
    complete: progress.is_complete,
    nextBeat: progress.is_complete ? null : progress.current_beat
  });
}