'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Starts (or resumes) a Date Night with a matched partner. Returns the game
 * id so the panel can open on it.
 */
export async function startDateNight(
  otherId: string
): Promise<{ gameId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { data, error } = await supabase.rpc('start_date_night', {
    p_other: otherId
  });

  if (data) return { gameId: data };

  if (error && error.message === 'game_active') {
    // Resume the running game instead of erroring out.
    const a = user.id < otherId ? user.id : otherId;
    const b = user.id < otherId ? otherId : user.id;
    const { data: game } = await supabase
      .from('date_nights')
      .select('id')
      .eq('user_a', a)
      .eq('user_b', b)
      .eq('status', 'active')
      .maybeSingle();
    if (game) return { gameId: game.id };
    return { error: error.message };
  }

  if (error) {
    console.error('startDateNight failed:', error.message);
    return { error: error.message };
  }
  return { error: 'could not start' };
}

/** Sets your pick on the live question (null = timeout/skip). */
export async function tapDateNight(
  gameId: string,
  index: number,
  pick: number | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('tap_date_night', {
    p_game: gameId,
    p_index: index,
    p_pick: pick as number // null = timeout/skip (JSON null passes through)
  });
  if (error) {
    // Stale taps (question already advanced) are fine to ignore.
    if (
      error.message === 'question_not_live' ||
      error.message === 'game_finished'
    ) {
      return {};
    }
    console.error('tapDateNight failed:', error.message);
    return { error: error.message };
  }
  return {};
}
