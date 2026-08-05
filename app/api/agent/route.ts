import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { streamAgent, GatewayMessage } from '@/utils/agent/gateway';
import {
  streamDeepseekDirect,
  DirectMessage
} from '@/utils/agent/deepseek-direct';
import {
  hasSwagAccess,
  swagSystemNote,
  swagMarkerTransform
} from '@/utils/agent/swag-marker';
import { withinBudget } from '@/utils/rate-limit';

// Abuse budgets (audit #9): generous for real use, bounded for spend.
// The cast calls cost real money per message, so a scripted hammer is
// capped per member AND per IP (catches multi-account scripts).
const AGENT_WINDOW_SECONDS = 60 * 60;
const USER_HOURLY_BUDGET = 60;
const IP_HOURLY_BUDGET = 200;

export const runtime = 'nodejs';
export const maxDuration = 30;

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

/**
 * The cast model comes from the Lions Den (model_config) so a down model
 * can be swapped without a redeploy — env DEEPSEEK_MODEL is the fallback.
 */
async function getCastModel(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('model_config')
    .select('cast_model')
    .eq('id', true)
    .maybeSingle();
  return data?.cast_model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
}

function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  const detail = (err as Error & { detail?: string }).detail;
  if (msg.includes('OIDC') || msg.includes('401') || msg.includes('auth'))
    return "The stage lights aren't on yet (auth). Check DEEPSEEK_API_KEY or VERCEL_OIDC_TOKEN.";
  if (msg.includes('deepseek_http_401'))
    return 'The bouncer rejected the key — check DEEPSEEK_API_KEY.';
  if (msg.includes('deepseek_http_402'))
    return 'DeepSeek is out of credits — top up and we are back on stage.';
  if (msg.includes('deepseek_http_404') || msg.includes('model'))
    return 'The script called for a model that does not exist. Check the model id.';
  if (msg.includes('deepseek_http'))
    return `DeepSeek said no (${msg.replace('deepseek_http_', '')}${detail ? `: ${detail}` : ''}).`;
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

  let body: { character?: string; message?: string; history?: GatewayMessage[] };
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

  // The money gate: checked before anything expensive runs. Budget is
  // consumed only on valid requests, so typos never eat your allowance.
  const ip =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    'unknown';
  const [userOk, ipOk] = await Promise.all([
    withinBudget(`agent:user:${user.id}`, AGENT_WINDOW_SECONDS, USER_HOURLY_BUDGET),
    withinBudget(`agent:ip:${ip}`, AGENT_WINDOW_SECONDS, IP_HOURLY_BUDGET)
  ]);
  if (!userOk || !ipOk) {
    return NextResponse.json(
      {
        error:
          'The cast is on a quick breather — you have been chatting a lot this hour. Give them a minute and pick it right back up.'
      },
      { status: 429 }
    );
  }

  const [{ data: char }, { data: profile }, tierData, ledger, { data: events }] =
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
      supabase.from('token_ledger').select('delta').eq('user_id', user.id),
      (async () => {
        await supabase.rpc('ensure_floor_events', { p_hours: 2 });
        return supabase
          .from('events')
          .select('kind, floor, starts_at, token_cost, status')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(4);
      })()
    ]);

  if (!char?.persona_prompt) {
    return NextResponse.json({ error: 'character not found' }, { status: 404 });
  }

  const balance = (ledger?.data ?? []).reduce(
    (sum, row) => sum + (row.delta ?? 0),
    0
  );
  const tier = (tierData?.data as string) ?? 'standard';
  const tierLabel =
    tier === 'gold'
      ? 'Gold'
      : tier === 'platinum'
        ? 'Platinum'
        : tier === 'diamond'
          ? 'Diamond'
          : 'Silver';

  const schedule = (events ?? [])
    .map(
      (e) =>
        `- ${new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${e.kind.replace(/_/g, ' ')} (${e.floor}, ${e.token_cost} tokens, ${e.status})`
    )
    .join('\n');

  const context = [
    `Member display name: ${profile?.display_name ?? 'Unknown'}`,
    `Verification: ${profile?.verified_at ? 'verified (VIP badge active)' : 'not yet verified — Brutus is at the door (free, ID check)'}`,
    `Floor: ${tierLabel}`,
    `Token balance: ${balance}`,
    `Upcoming events (real):\n${schedule}`
  ].join('\n');

  const system = buildSystemPrompt(char.persona_prompt, context);
  const swagNote = hasSwagAccess(character) ? swagSystemNote(character) : '';

  // Cast delivery: the owner approved a flag and handed the CODE to this
  // character to deliver in-character. Shown once, then marked delivered.
  let deliveryNote = '';
  const { data: delivery } = await supabaseAdmin
    .from('swag_codes')
    .select('code, benefit_type, benefit_value')
    .eq('deliver_to_user_id', user.id)
    .eq('deliver_via_actor', character)
    .is('deliver_shown_at', null)
    .eq('used_count', 0)
    .limit(1)
    .maybeSingle();
  if (delivery) {
    deliveryNote = `\n===== CAST DELIVERY =====\nThe owner approved ${delivery.benefit_type} (${delivery.benefit_value}) for this member — you have the code: ${delivery.code}. Hand it over in your voice and tell them to redeem it in the Swag Shop. It is real and already paid for — do not act like it might fail.`;
    await supabaseAdmin
      .from('swag_codes')
      .update({ deliver_shown_at: new Date().toISOString() })
      .eq('code', delivery.code);
  }

  const fullSystem = `${system}${swagNote ? `\n${swagNote}` : ''}${deliveryNote}`;

  try {
    const messages: DirectMessage[] = [
      ...(Array.isArray(body.history) ? body.history.slice(-10) : []),
      { role: 'user', content: message }
    ];

    // Swag hook: turns [[SWAG:slug]] markers into real codes (or flags the
    // owner) as the reply streams. Applies to both model paths below.
    const swagTransform = swagMarkerTransform(character, user.id);

    // Primary: straight to DeepSeek (cheapest, no middleman). The gateway
    // is the free fallback when no DEEPSEEK_API_KEY is set.
    const directKey = process.env.DEEPSEEK_API_KEY;
    if (directKey) {
      const stream = await streamDeepseekDirect({
        apiKey: directKey,
        model: await getCastModel(),
        system: fullSystem,
        messages
      });
      return new NextResponse(stream.pipeThrough(swagTransform), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const result = streamAgent({ system: fullSystem, messages });
    // Pump the async text stream into a web ReadableStream.
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
    return new NextResponse(stream.pipeThrough(swagTransform), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } catch (err) {
    console.error('agent failed:', err);
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
