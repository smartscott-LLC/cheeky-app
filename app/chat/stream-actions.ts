'use server';

// Stream-backed chat actions. Called from the Stream overlay; they
// translate the existing moderation primitives onto Stream's API so the
// data plane and the live chat stay in lockstep.

import { getUser } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import { getStreamServer, streamEnabled } from '@/utils/stream/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { authorized } from '@/app/owner/actions-helpers';

const TIER_RANK: Record<string, number> = {
  silver: 0,
  gold: 1,
  platinum: 2,
  diamond: 3
};

async function getMyTier(): Promise<string> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return 'silver';
  const { data } = await supabase.rpc('current_tier', { p_user: user.id });
  return (data as string) ?? 'silver';
}

/** Send a message into a Stream town-square channel. The room gate is
 *  enforced here — Stream doesn't know about the floor ladder, we do. */
export async function streamSend(
  room: string,
  body: string,
  options: { horn?: boolean } = {}
): Promise<{ id?: string; error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  if (!['global', 'silver', 'gold', 'platinum', 'diamond'].includes(room)) {
    return { error: 'invalid_room' };
  }
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_authenticated' };
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { error: 'invalid_message_length' };
  }
  if (room !== 'global') {
    const tier = await getMyTier();
    if ((TIER_RANK[tier] ?? 0) < TIER_RANK[room]) {
      return { error: 'floor_too_high' };
    }
  }
  // The Horn costs 10 tokens and burns one slot per hour.
  if (options.horn) {
    const { error: hornErr } = await streamHorn(trimmed);
    if (hornErr) return { error: hornErr };
    return { id: 'horn' };
  }
  const client = getStreamServer();
  const channelId = `cheeky-${room}`;
  const ch = client.channel('messaging', channelId, { created_by_id: 'system' });
  // Server SDK sendMessage uses the channel context; we use the admin
  // client (server-side) and pass the user id explicitly so Stream
  // attributes the message to the right member.
  await ch.create().catch(() => undefined);
  const tier = await getMyTier();
  const sent = await ch.sendMessage(
    {
      text: trimmed,
      user_id: user.id,
      custom: { floor: tier, horn: false }
    } as unknown as Parameters<typeof ch.sendMessage>[0]
  );
  return { id: (sent.message as { id?: string } | undefined)?.id };
}

/** Horn: debits 10 tokens, then posts a horn-flagged message into the
 *  Global room. The webhook handler mirrors the message + the ticker
 *  row into Supabase. */
export async function streamHorn(body: string): Promise<{ error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_authenticated' };

  // The 1-per-hour cap lives in the existing bump_rate_limit RPC.
  const { data: ok, error: rateErr } = await supabase.rpc('bump_rate_limit', {
    p_key: `horn:user:${user.id}`,
    p_window_seconds: 3600,
    p_max: 1
  });
  if (rateErr) return { error: rateErr.message };
  if (!ok) return { error: 'horn_cooldown' };

  // 10 tokens, server-side ledger; check the balance.
  const { data: bal } = await supabase
    .from('token_ledger')
    .select('delta')
    .eq('user_id', user.id);
  const balance = (bal ?? []).reduce(
    (s, r: { delta: number }) => s + (r.delta ?? 0),
    0
  );
  const { data: holds } = await supabase
    .from('event_entries')
    .select('events(token_cost)')
    .eq('user_id', user.id)
    .eq('status', 'reserved');
  const holdSum = (holds ?? []).reduce((s, e) => {
    const cost =
      ((e as { events: { token_cost: number } | null }).events?.token_cost ?? 0);
    return s + cost;
  }, 0);
  if (balance - holdSum < 10) return { error: 'insufficient_tokens' };

  await supabaseAdmin.from('token_ledger').insert({
    user_id: user.id,
    delta: -10,
    reason: 'horn'
  });
  await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<unknown>)('award_badge', {
    p_user: user.id,
    p_slug: 'chat_horn'
  });

  const client = getStreamServer();
  const ch = client.channel('messaging', 'cheeky-global', {
    created_by_id: 'system'
  } as Record<string, unknown>);
  await ch.create().catch(() => undefined);
  const tier = await getMyTier();
  await ch.sendMessage(
    {
      text: body.trim(),
      user_id: user.id,
      custom: { floor: tier, horn: true }
    } as unknown as Parameters<typeof ch.sendMessage>[0]
  );
  return {};
}

/** Whisper — open or reuse a 1:1 channel between two members. */
export async function streamWhisperGet(
  otherId: string
): Promise<{ channelId?: string; error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_authenticated' };
  if (user.id === otherId) return { error: 'cannot_whisper_self' };
  const client = getStreamServer();
  const sorted = [user.id, otherId].sort();
  const channelId = `cheeky-whisper-${sorted[0]}-${sorted[1]}`;
  const ch = (client as unknown as {
    channel: (
      type: string,
      id: string,
      data?: Record<string, unknown>
    ) => { create: () => Promise<unknown> };
  }).channel('messaging', channelId, {
    members: sorted,
    is_whisper: true,
    created_by_id: 'system'
  });
  await ch.create().catch(() => undefined);
  return { channelId };
}

/** Whisper send. */
export async function streamWhisperSend(
  channelId: string,
  body: string
): Promise<{ id?: string; error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_authenticated' };
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { error: 'invalid_message_length' };
  }
  const client = getStreamServer();
  const ch = client.channel('messaging', channelId);
  const sent = await ch.sendMessage({
    text: trimmed,
    user_id: user.id
  } as unknown as Parameters<typeof ch.sendMessage>[0]);
  return { id: (sent.message as { id?: string } | undefined)?.id };
}

/** Owner one-click Stream ban. Mirrors into Supabase so the existing
 *  club_chat_ban table still drives the Supabase fallback path. */
export async function ownerStreamBan(input: {
  key?: string;
  userId: string;
  reason: string;
  hours: 24 | 72;
}): Promise<{ error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const client = getStreamServer() as unknown as {
    banUser: (
      userId: string,
      opts: Record<string, unknown>
    ) => Promise<unknown>;
  };
  await client.banUser(input.userId, {
    banned_by: 'system',
    reason: input.reason,
    timeout: input.hours * 60 // minutes
  });
  // Mirror into Supabase for the fallback path.
  await supabaseAdmin.from('club_chat_bans').insert({
    user_id: input.userId,
    banned_until: new Date(Date.now() + input.hours * 3_600_000).toISOString(),
    reason: input.reason
  });
  return {};
}
