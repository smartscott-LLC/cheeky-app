'use server';

import { createClient } from '@/utils/supabase/server';

export async function joinEvent(eventId: string): Promise<{ error?: string }> {
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

export async function leaveEvent(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_event', { p_event_id: eventId });
  if (error) {
    console.error('leaveEvent failed:', error.message);
    return { error: error.message };
  }
  return {};
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

/** Blind Date: the chooser launches her room (Gold+). */
export async function createBlindDate(): Promise<{
  eventId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_blind_date');
  if (error) {
    console.error('createBlindDate failed:', error.message);
    return { error: error.message };
  }
  return { eventId: data };
}

/** Blind Date: a suitor buys a seat (Gold+, min 3 / cap 5). */
export async function joinBlindDate(
  eventId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_blind_date', {
    p_event_id: eventId
  });
  if (error) {
    console.error('joinBlindDate failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Blind Date: back out while the room is still open. */
export async function leaveBlindDate(
  eventId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_blind_date', {
    p_event_id: eventId
  });
  if (error) {
    console.error('leaveBlindDate failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Blind Date: the chooser asks a question (question phase). */
export async function submitBlindQuestion(
  eventId: string,
  round: number,
  question: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_blind_question', {
    p_event_id: eventId,
    p_round: round,
    p_question: question
  });
  if (error) {
    console.error('submitBlindQuestion failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Blind Date: a suitor answers (answer phase). */
export async function submitBlindAnswer(
  eventId: string,
  round: number,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_blind_answer', {
    p_event_id: eventId,
    p_round: round,
    p_body: body
  });
  if (error) {
    console.error('submitBlindAnswer failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Blind Date: the chooser gives ONE tally (selection phase). */
export async function selectBlindTally(
  eventId: string,
  round: number,
  selectedUserId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('select_blind_tally', {
    p_event_id: eventId,
    p_round: round,
    p_selected: selectedUserId
  });
  if (error) {
    console.error('selectBlindTally failed:', error.message);
    return { error: error.message };
  }
  return {};
}
