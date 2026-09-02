import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { selectPersona } from '@/utils/story/server';
import { PERSONAS } from '@/utils/story/beats';

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  let body: { personaSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { personaSlug } = body;
  if (!personaSlug) {
    return NextResponse.json(
      { error: 'personaSlug required' },
      { status: 400 }
    );
  }

  const persona = PERSONAS.find((p) => p.slug === personaSlug);
  if (!persona) {
    return NextResponse.json({ error: 'persona not found' }, { status: 404 });
  }

  const progress = await selectPersona(personaSlug);
  if (!progress) {
    return NextResponse.json(
      { error: 'failed to select persona' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, persona: personaSlug });
}