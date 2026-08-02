import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { callDeepSeek, AgentMessage, AgentTool } from '@/utils/agent/deepseek';

export const runtime = 'nodejs';
export const maxDuration = 30;

// One real tool: the characters can pull the actual event schedule and
// recommend a room grounded in reality. No invented events, ever.
const TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_next_events',
      description:
        'Returns the next scheduled Club Cheeky events (room, floor, token cost, start time, status). Use when recommending an event or answering "what is happening next".',
      parameters: { type: 'object', properties: {} }
    }
  }
];

const HOUSE_RULES = `You are an AI character at Club Cheeky, an in-app dating club. Follow these house rules absolutely:
1. HONEST: You are clearly an AI character, not a real person. Never claim to be human, never invent matches, likes, messages, users, token balances, prices, or events. If the user asks about specific members, explain you cannot see anyone else's private information — point them to Browse and the events.
2. ENCOURAGING: Never write the user off. If they are discouraged, encourage them and point to real things to do (Browse, the Dance Floor, events, Date Night with a match). If they report harassment or feel unsafe, firmly direct them to Report/Block (one tap in any chat) and reassure them a human bouncer reviews every report.
3. FUN AND FREE: The free tier is genuinely free and fun. Never push purchases, never invent prices, never apply pressure. Keep the vibe upbeat.
4. VOICE: Stay in character exactly as your persona describes — including their speech patterns, warmth levels, and tics. Keep replies short and punchy (a club, not a novel).`;

function buildSystemPrompt(persona: string, context: string): string {
  return `${persona}

===== MEMBER CONTEXT (private, real — use it to be genuinely helpful) =====
${context}

===== HOUSE RULES =====
${HOUSE_RULES}`;
}

function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'deepseek_key_missing')
    return "The characters are still warming up — the stage lights haven't been switched on yet (DeepSeek key missing). Check back soon.";
  if (msg.startsWith('deepseek_http_'))
    return 'The line got crossed. Give it a second and try again.';
  return 'Something fizzled in the sound system. Try again.';
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  let body: { character?: string; message?: string; history?: AgentMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const character = String(body.character ?? '').trim();
  const message = String(body.message ?? '').trim().slice(0, 1000);
  if (!character || !message) {
    return NextResponse.json({ error: 'character and message required' }, { status: 400 });
  }

  const [{ data: char }, { data: profile }, tierData, ledger] =
    await Promise.all([
      supabase
        .from('characters')
        .select('name, role, persona_prompt')
        .eq('slug', character)
        .eq('active', true)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('display_name, verified_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.rpc('current_tier', { p_user: user.id }),
      supabase.from('token_ledger').select('delta')
    ]);

  const balance = (ledger?.data ?? []).reduce(
    (sum, row) => sum + (row.delta ?? 0),
    0
  );

  if (!char?.persona_prompt) {
    return NextResponse.json({ error: 'character not found' }, { status: 404 });
  }

  const tier = (tierData?.data as string) ?? 'standard';
  const tierLabel =
    tier === 'gold'
      ? 'Gold'
      : tier === 'platinum'
        ? 'Platinum'
        : tier === 'diamond'
          ? 'Diamond'
          : 'Silver';
  const context = [
    `Member display name: ${profile?.display_name ?? 'Unknown'}`,
    `Verification: ${profile?.verified_at ? 'verified (VIP badge active)' : 'not yet verified — Brutus is at the door (free, ID check)'}`,
    `Floor: ${tierLabel}`,
    `Token balance: ${balance}`,
    `Joined the club as: ${new Date(user.created_at).toLocaleDateString()}`
  ].join('\n');

  const system = buildSystemPrompt(char.persona_prompt, context);
  const messages: AgentMessage[] = [
    ...(Array.isArray(body.history) ? body.history.slice(-10) : []),
    { role: 'user', content: message }
  ];

  try {
    // One tool round-trip max — enough for grounded recommendations.
    const first = await callDeepSeek({ system, messages, tools: TOOLS });
    if (first.toolCalls?.length) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: first.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments }
        }))
      });

      for (const tc of first.toolCalls) {
        let result = '{}';
        if (tc.name === 'get_next_events') {
          await supabase.rpc('ensure_floor_events', { p_hours: 2 });
          const { data: events } = await supabase
            .from('events')
            .select('kind, floor, starts_at, token_cost, status')
            .gte('starts_at', new Date().toISOString())
            .order('starts_at')
            .limit(4);
          result = JSON.stringify(events ?? []);
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result
        });
      }

      const second = await callDeepSeek({ system, messages });
      return NextResponse.json({ reply: second.text ?? '' });
    }

    return NextResponse.json({ reply: first.text ?? '' });
  } catch (err) {
    console.error('agent failed:', err);
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
