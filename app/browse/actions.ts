'use server';

import { createClient } from '@/utils/supabase/server';
import { getProfile } from '@/utils/supabase/queries';
import { isCompatible } from '@/utils/helpers';
import type { Database } from '@/types_db';

// ============================================================
// Swipes — the 1-for-1
// ============================================================

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

// ============================================================
// L³ (Leave · Like · Love) — PRD docs/PRD-l3.md
// ============================================================

export type L3Person = Database['public']['Functions']['l3_trio']['Returns'][number];

export type L3PickResult = {
  matchId?: string | null;
  tier?: 't1' | 't2' | null;
  error?: string;
};

/**
 * L³ next trio — the RPC pulls a random any-floor batch (excluding self,
 * already-picked, blocked, unverified, photo-less); we then apply the same
 * mutual-compatibility filter as Swipes and slice to three.
 */
export async function l3NextTrio(): Promise<{
  people: L3Person[];
  done: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { people: [], done: true };

  const myProfile = await getProfile(supabase, user.id);

  const [trio, liked, matched] = await Promise.all([
    supabase.rpc('l3_trio', {}),
    supabase.from('likes').select('likee_id').eq('liker_id', user.id),
    supabase
      .from('matches')
      .select('user_id_a, user_id_b')
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)
  ]);

  if (trio.error) return { people: [], done: true, error: trio.error.message };

  const exclude = new Set<string>([user.id]);
  (liked.data ?? []).forEach((l) => exclude.add(l.likee_id));
  (matched.data ?? []).forEach((m) => {
    exclude.add(m.user_id_a);
    exclude.add(m.user_id_b);
  });

  const people = (trio.data ?? [])
    .filter((p) => !exclude.has(p.id) && isCompatible(myProfile, p))
    .slice(0, 3);

  return { people, done: people.length === 0 };
}

/** L³ pick — one immutable Leave/Like/Love; the RPC settles any mutual match + tier. */
export async function l3Pick(
  targetId: string,
  choice: 'leave' | 'like' | 'love'
): Promise<L3PickResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_l3_pick', {
    p_target: targetId,
    p_choice: choice
  });
  if (error) return { error: error.message };
  const row = data?.[0];
  return {
    matchId: row?.match_id ?? null,
    tier: (row?.tier as 't1' | 't2') ?? null
  };
}
