'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { recordMoment } from '@/utils/character-moments';
import { getUser } from '@/utils/supabase/queries';
import { getStreamServer } from '@/utils/stream/server';

/** Buys a gift from the catalog — floor-gated, ledger debit, to inventory. */
export async function buyGift(slug: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('buy_gift', { p_slug: slug });
  if (error) {
    console.error('buyGift failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Sends a gift from your stash — 1 offer per 15 minutes, block-aware, ticker fires. */
export async function sendGift(
  giftId: string,
  recipientId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_gift', {
    p_gift_id: giftId,
    p_recipient: recipientId
  });
  if (error) {
    console.error('sendGift failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Accept (pass + date room) or deny (silent return) an incoming gift. */
export async function respondGift(
  sendId: string,
  accept: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase.rpc('respond_gift', {
    p_send_id: sendId,
    p_accept: accept
  });
  if (error) {
    console.error('respondGift failed:', error.message);
    return { error: error.message };
  }

  // Personal milestone — the cast congratulates you for accepting a gift.
  if (accept) {
    await recordMoment(user.id, 'gift_accepted');
  }
  return {};
}

/**
 * Blow the Horn from the gift shop — 5 tokens, one per 15 minutes,
 * chat-room only (no ticker announcement).
 * For the full horn (ticker + chat), users can use the horn button inside the lounge.
 */
export async function blowHorn(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_signed_in' };

  // 1-per-15-min cooldown
  const { data: ok } = await supabase.rpc('bump_rate_limit', {
    p_key: `horn:shop:${user.id}`,
    p_window_seconds: 900,
    p_max: 1
  });
  if (!ok) return { error: 'horn_cooldown' };

  // Check balance
  const { data: ledger } = await supabase
    .from('token_ledger')
    .select('delta')
    .eq('user_id', user.id);
  const balance = (ledger ?? []).reduce(
    (s: number, r: { delta: number }) => s + (r.delta ?? 0),
    0
  );
  if (balance < 5) return { error: 'insufficient_tokens' };

  // Debit 5 tokens
  const { error: debitError } = await supabaseAdmin
    .from('token_ledger')
    .insert({ user_id: user.id, delta: -5, reason: 'horn_shop' });
  if (debitError) return { error: debitError.message };

  // Send to global chat room (chat-only, no ticker)
  const client = getStreamServer();
  const ch = client.channel('messaging', 'cheeky-global', {
    created_by_id: 'system'
  } as Record<string, unknown>);
  await ch.create().catch(() => undefined);
  await ch.sendMessage({
    text: '🎺 Someone just blew the Horn!',
    user_id: user.id,
    custom: { floor: 'silver', horn: true }
  } as unknown as Parameters<typeof ch.sendMessage>[0]);

  // Award badge
  await supabaseAdmin.rpc('award_badge', {
    p_user: user.id,
    p_slug: 'chat_horn'
  });

  return {};
}

/**
 * Blow the Full Horn from the gift shop — 10 tokens, one per 15 minutes.
 * Posts to BOTH the ticker AND the global chat room.
 * Available to all verified members regardless of floor.
 */
export async function blowHornFull(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'not_signed_in' };

  // 1-per-15-min cooldown (separate key from chat-only horn)
  const { data: ok } = await supabase.rpc('bump_rate_limit', {
    p_key: `horn:shop:full:${user.id}`,
    p_window_seconds: 900,
    p_max: 1
  });
  if (!ok) return { error: 'horn_cooldown' };

  // Check balance
  const { data: ledger } = await supabase
    .from('token_ledger')
    .select('delta')
    .eq('user_id', user.id);
  const balance = (ledger ?? []).reduce(
    (s: number, r: { delta: number }) => s + (r.delta ?? 0),
    0
  );
  if (balance < 10) return { error: 'insufficient_tokens' };

  // Debit 10 tokens
  const { error: debitError } = await supabaseAdmin
    .from('token_ledger')
    .insert({ user_id: user.id, delta: -10, reason: 'horn_shop_full' });
  if (debitError) return { error: debitError.message };

  // Write ticker announcement
  await supabaseAdmin.from('club_announcements').insert({
    body: '🎺 Someone just blew the Horn!',
    kind: 'horn'
  });

  // Send to global chat room
  const client = getStreamServer();
  const ch = client.channel('messaging', 'cheeky-global', {
    created_by_id: 'system'
  } as Record<string, unknown>);
  await ch.create().catch(() => undefined);
  await ch.sendMessage({
    text: '🎺 Someone just blew the Horn!',
    user_id: user.id,
    custom: { floor: 'silver', horn: true }
  } as unknown as Parameters<typeof ch.sendMessage>[0]);

  // Award badge
  await supabaseAdmin.rpc('award_badge', {
    p_user: user.id,
    p_slug: 'chat_horn'
  });

  return {};
}
