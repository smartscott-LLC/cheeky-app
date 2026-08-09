'use server';

import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';

// ============================================================
// The Cheeky Lounge — the town square (PRD docs/PRD-club-chat.md)
// Server actions wrap the club_chat_* RPCs; reads ride RLS on the
// tables, realtime rides the browser client.
// ============================================================

/** Post to a room (your floor + global; upper floors refuse server-side). */
export async function loungeSend(
  room: string,
  body: string
): Promise<{ id?: number; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('club_chat_send', {
    p_room: room,
    p_body: body
  });
  if (error) return { error: error.message };
  return { id: data ?? undefined };
}

/** The Horn — 10 tokens, one per hour, lights up + crosses the ticker. */
export async function loungeHorn(
  body: string
): Promise<{ id?: number; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('club_chat_horn', {
    p_body: body
  });
  if (error) return { error: error.message };
  return { id: data ?? undefined };
}

/** Take-private invite (the consent dialog is the inviter's consent). */
export async function loungeInvite(
  userId: string
): Promise<{ inviteId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('club_chat_invite', {
    p_user: userId
  });
  if (error) return { error: error.message };
  return { inviteId: data ?? undefined };
}

/** Accept (a match — both allowances checked) or decline (silent). */
export async function loungeRespondInvite(
  inviteId: string,
  accept: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('club_chat_respond_invite', {
    p_invite_id: inviteId,
    p_accept: accept
  });
  if (error) return { error: error.message };
  return {};
}

/** Open (or reuse) the ephemeral whisper room with someone. */
export async function loungeWhisperGet(
  userId: string
): Promise<{ whisperId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('club_chat_whisper_get', {
    p_other: userId
  });
  if (error) return { error: error.message };
  return { whisperId: data ?? undefined };
}

/** Whisper message (ephemeral, no caps). */
export async function loungeWhisperSend(
  whisperId: string,
  body: string
): Promise<{ id?: number; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('club_chat_whisper_send', {
    p_whisper_id: whisperId,
    p_body: body
  });
  if (error) return { error: error.message };
  return { id: data ?? undefined };
}

/** Presence heartbeat — feeds The Regular (an hour in the room). */
export async function loungeHeartbeat(seconds: number): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('club_chat_heartbeat', { p_seconds: seconds });
}

/** My effective tier — drives the dimmed-above rendering. */
export async function loungeTier(): Promise<string | null> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return null;
  const { data } = await supabase.rpc('current_tier', { p_user: user.id });
  return (data as string) ?? null;
}

/** Verified? The button only exists past the velvet rope. */
export async function loungeVerified(): Promise<boolean> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('verified_at')
    .eq('id', user.id)
    .maybeSingle();
  return Boolean(data?.verified_at);
}

/** Friend ids (matches + conversations) — the presence list highlights them. */
export async function loungeFriendIds(): Promise<string[]> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return [];
  const [matches, convos] = await Promise.all([
    supabase
      .from('matches')
      .select('user_id_a, user_id_b')
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`),
    supabase
      .from('conversations')
      .select('user_id_a, user_id_b')
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)
  ]);
  const ids = new Set<string>();
  for (const m of matches.data ?? []) {
    if (m.user_id_a !== user.id) ids.add(m.user_id_a);
    if (m.user_id_b !== user.id) ids.add(m.user_id_b);
  }
  for (const c of convos.data ?? []) {
    if (c.user_id_a !== user.id) ids.add(c.user_id_a);
    if (c.user_id_b !== user.id) ids.add(c.user_id_b);
  }
  return Array.from(ids);
}
