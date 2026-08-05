'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Likes another member via the atomic create_like RPC. If they already
 * liked you, an instant match is created and its id is returned.
 */
export async function likeUser(
  userId: string
): Promise<{ matched: boolean; matchId?: string | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_like', {
    p_likee: userId
  });

  if (error) {
    console.error('Like failed:', error.message);
    return { matched: false, error: error.message };
  }

  const matchId = data?.[0]?.match_id ?? null;
  return { matched: Boolean(matchId), matchId };
}

/**
 * Sends a one-tap "noticed you" wave. Lighter than a Like — no match
 * trigger, no pressure. The recipient sees it in Messages and can say hi.
 */
export async function waveAt(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase.from('waves').insert({
    sender_id: user.id,
    recipient_id: userId
  });
  if (error) {
    console.error('wave failed:', error.message);
    return { error: error.message };
  }
  return {};
}
