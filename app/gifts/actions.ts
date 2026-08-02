'use server';

import { createClient } from '@/utils/supabase/server';

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

/** Sends a gift from your stash — 1 offer/hour, block-aware, ticker fires. */
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
  const { error } = await supabase.rpc('respond_gift', {
    p_send_id: sendId,
    p_accept: accept
  });
  if (error) {
    console.error('respondGift failed:', error.message);
    return { error: error.message };
  }
  return {};
}
