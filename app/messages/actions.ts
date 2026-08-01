'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Resolves (or creates) the conversation with another member and opens it.
 */
export async function openConversation(otherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_other: otherId
  });

  if (error) {
    console.error('openConversation failed:', error.message);
    return redirect('/messages');
  }

  return redirect(`/messages/${data}`);
}

/**
 * Sends a message through the enforcing RPC (matched: unlimited,
 * cold: 5/day, block-aware). Returns errors for the composer to show.
 */
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body
  });

  if (error) {
    console.error('sendMessage failed:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function reportUser(
  reportedId: string,
  reason: string,
  context?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
    context: context ?? null
  });

  if (error) {
    console.error('report failed:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function blockUser(
  blockedId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase.from('blocks').insert({
    blocker_id: user.id,
    blocked_id: blockedId
  });

  if (error) {
    console.error('block failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Song chat: event messages travel outside daily messaging caps. */
export async function sendEventMessage(
  conversationId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_event_message', {
    p_conversation_id: conversationId,
    p_body: body
  });
  if (error) {
    console.error('sendEventMessage failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Post-song decision: continue the match or close it (no follow-ups). */
export async function resolveSong(
  matchId: string,
  keepGoing: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('resolve_song', {
    p_match_id: matchId,
    p_continue: keepGoing
  });
  if (error) {
    console.error('resolveSong failed:', error.message);
    return { error: error.message };
  }
  return {};
}
