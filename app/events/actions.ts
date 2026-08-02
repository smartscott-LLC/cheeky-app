'use server';

import { createClient } from '@/utils/supabase/server';

export async function joinEvent(
  eventId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_event', {
    p_event_id: eventId
  });
  if (error) {
    console.error('joinEvent failed:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function leaveEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.rpc('leave_event', { p_event_id: eventId });
}

export async function pickOnFloor(
  eventId: string,
  pickeeId: string
): Promise<{ matched: boolean; matchId?: string | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('pick_on_floor', {
    p_event_id: eventId,
    p_pickee: pickeeId
  });
  if (error) {
    console.error('pickOnFloor failed:', error.message);
    return { matched: false, error: error.message };
  }
  const row = data?.[0];
  return { matched: Boolean(row?.matched), matchId: row?.match_id ?? null };
}

/** Speed Dating: session chat message (no daily caps). */
export async function sendSpeedMessage(
  eventId: string,
  groupNumber: number,
  slotIndex: number,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_speed_message', {
    p_event_id: eventId,
    p_group: groupNumber,
    p_slot: slotIndex,
    p_body: body
  });
  if (error) {
    console.error('sendSpeedMessage failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Speed Dating: rank a pick (1 = top, 2 = alternate). */
export async function selectSpeedRank(
  eventId: string,
  rank: number,
  pickedUserId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('select_speed_rank', {
    p_event_id: eventId,
    p_pick_rank: rank,
    p_picked: pickedUserId
  });
  if (error) {
    console.error('selectSpeedRank failed:', error.message);
    return { error: error.message };
  }
  return {};
}
