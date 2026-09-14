'use server';

import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import {
  streamAGNESDirect,
  DirectMessage
} from '@/utils/agent/deepseek-direct';
import { NextResponse } from 'next/server';

const CHARACTERS: Record<string, { name: string; prompt: string }> = {
  trixie: {
    name: 'Trixie',
    prompt: `You are Trixie, the Platinum floor hostess at Club Cheeky. You work the room, read the vibe, and help members find their best self. You write concise, punchy bios - not paragraphs. You ask one question at a time, build on what they say, and deliver a final draft the member can edit. Keep it fun, confident, and real. Never flatter without substance. Never write anything that sounds corporate.`
  },
  bartender: {
    name: 'Roxy',
    prompt: `You are Roxy, the Gold floor bartender. You've seen everything, heard every line, and you know what makes someone memorable. You write bios with a wink - confident, playful, a little dangerous. Keep it short. The club doesn't read essays. Never bore them. Never sound like you're trying too hard.`
  },
  hostess: {
    name: 'Valentina',
    prompt: `You are Valentina, the Diamond floor hostess. You run the Coat Check and decide who gets in. You've got taste, you've got standards, and you know what makes someone stand out from the street. Write the bio the room will remember. Sharp. Memorable. Real. If it's forgettable, rewrite it.`
  }
};

export interface DraftSession {
  personality: string;
  vices: string;
  home: string;
  hobbies: string;
}

export async function POST(req: Request) {
  let body: { draft?: DraftSession; existingBio?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const result = await getBioDraft(body.draft ?? null, body.existingBio ?? '');
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ draft: result.draft });
}

export async function getBioDraft(
  draft: DraftSession | null,
  existingBio: string
): Promise<{ error?: string; draft?: string }> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_signed_in' };

  const charKey = draft?.personality ?? 'trixie';
  const char = CHARACTERS[charKey];
  if (!char) return { error: 'invalid_character' };

  // Build the draft prompt from what they told us
  const parts: string[] = [];
  if (draft?.vices) parts.push(`Vices/likes: ${draft.vices}`);
  if (draft?.home) parts.push(`Living situation: ${draft.home}`);
  if (draft?.hobbies) parts.push(`Hobbies: ${draft.hobbies}`);
  if (existingBio) parts.push(`Current bio: "${existingBio}"`);

  const context =
    parts.length > 0 ? 'Context: ' + parts.join(', ') : 'Nothing shared yet';

  const system = `${char.prompt}\n\nYou are helping a member write their bio. They've given you some context. Produce a single bio draft (max 200 characters) that's confident, fun, and makes them sound like someone worth meeting. Output ONLY the bio text - no explanations, no quotes, no markdown.`;

  const directKey = process.env.MODEL_API_KEY;
  if (!directKey) return { error: 'ai_unavailable' };

  try {
    const messages: DirectMessage[] = [{ role: 'user', content: context }];
    const stream = await streamAGNESDirect({
      apiKey: directKey,
      model: 'agnes-02.5-flash',
      system,
      messages
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let draftText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      draftText += decoder.decode(value, { stream: true });
    }
    // Clean up - take the first line, trim whitespace
    const cleaned = draftText.trim().split('\n')[0].trim().slice(0, 200);
    return { draft: cleaned || undefined };
  } catch (err) {
    console.error('getBioDraft failed:', err);
    return { error: 'draft_failed' };
  }
}
