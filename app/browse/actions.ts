'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Likes another member via the atomic create_like RPC. If they already
 * liked you, an instant match is created and its id is returned.
 */
export async function likeUser(
  userId: string
): Promise<{ matched: boolean; matchId?: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_like', {
    p_likee: userId
  });

  if (error) {
    console.error('Like failed:', error.message);
    return { matched: false };
  }

  const matchId = data?.[0]?.match_id ?? null;
  return { matched: Boolean(matchId), matchId };
}
