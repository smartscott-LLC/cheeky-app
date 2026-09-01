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

// ============================================================
// Matchmaker — the memory-game spark mode (PRD docs/PRD-matchmaker.md)
// ============================================================

export type MatchmakerCandidate = Database['public']['Functions']['matchmaker_draft_candidates']['Returns'][number];
export type MatchmakerBoardRow = Database['public']['Functions']['matchmaker_start_board']['Returns'][number];
export type MatchmakerCard = Database['public']['Functions']['matchmaker_board_cards']['Returns'][number];
export type MatchmakerFlip = Database['public']['Functions']['matchmaker_flip']['Returns'][number];
export type MatchmakerIncoming = Database['public']['Functions']['matchmaker_incoming']['Returns'][number];

export interface MatchmakerActiveBoard {
  id: string;
  status: 'drafting' | 'live' | 'won' | 'lost';
  strikes: number;
  matches_found: number;
  flipped_card_id: string | null;
}

/**
 * The Matchmaker tab's opening state: plays left, pending incoming unlocks,
 * and any active (drafting/live) board to resume.
 */
export async function matchmakerState(): Promise<{
  playsLeft: number | null;
  incoming: MatchmakerIncoming[];
  active: MatchmakerActiveBoard | null;
  error?: string;
}> {
  const supabase = await createClient();
  const [plays, incoming, active] = await Promise.all([
    supabase.rpc('taskbar_state'),
    supabase.rpc('matchmaker_incoming'),
    supabase
      .from('matchmaker_boards')
      .select('id, status, strikes, matches_found, flipped_card_id')
      .in('status', ['drafting', 'live'])
      .order('created_at', { ascending: false })
      .limit(1)
  ]);
  const errors = [plays.error, incoming.error, active.error]
    .map((e) => e?.message)
    .filter(Boolean);
  return {
    playsLeft: plays.data?.[0]?.matchmaker_plays_left ?? null,
    incoming: incoming.data ?? [],
    active: (active.data?.[0] as MatchmakerActiveBoard | undefined) ?? null,
    error: errors.length ? errors.join('; ') : undefined
  };
}

/** Open (or resume) the phase-1 draft board. */
export async function matchmakerStartDraft(): Promise<{
  boardId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_start_draft');
  if (error) return { error: error.message };
  return { boardId: data ?? undefined };
}

/** The draft strip — server-filtered (floor-or-beneath, compatible, un-liked). */
export async function matchmakerDraftCandidates(): Promise<{
  people: MatchmakerCandidate[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_draft_candidates');
  if (error) return { people: [], error: error.message };
  return { people: data ?? [] };
}

/** Draft a face — your floor or beneath; real likes are never touched. */
export async function matchmakerPickDraft(
  targetId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('matchmaker_pick_draft', {
    p_target: targetId
  });
  if (error) return { error: error.message };
  return {};
}

/** Lock in the 2 drafts, consume a play, and build the 16-card board. */
export async function matchmakerStartBoard(): Promise<{
  rows?: MatchmakerBoardRow[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_start_board');
  if (error) return { error: error.message };
  return { rows: data ?? [] };
}

/** The client's only window into a live board: positions + face-up cards. */
export async function matchmakerBoardCards(
  boardId: string
): Promise<{ cards: MatchmakerCard[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_board_cards', {
    p_board_id: boardId
  });
  if (error) return { cards: [], error: error.message };
  return { cards: data ?? [] };
}

/** Unlocks already sent on a board (so a matched pair doesn't double-prompt). */
export async function matchmakerBoardUnlocks(
  boardId: string
): Promise<{ sent: Set<string>; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { sent: new Set() };
  const { data, error } = await supabase
    .from('matchmaker_unlocks')
    .select('recipient_id')
    .eq('board_id', boardId)
    .eq('sender_id', user.id);
  if (error) return { sent: new Set(), error: error.message };
  return { sent: new Set((data ?? []).map((u) => u.recipient_id)) };
}

/** Flip a card — reveals the face; resolves match/strike on the second flip. */
export async function matchmakerFlip(
  cardId: string
): Promise<{ flip?: MatchmakerFlip; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_flip', {
    p_card_id: cardId
  });
  if (error) return { error: error.message };
  return { flip: data?.[0] };
}

/** Send the first-impression message for a matched pair. */
export async function matchmakerSendUnlock(
  cardId: string,
  message: string
): Promise<{ unlockId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_send_unlock', {
    p_card_id: cardId,
    p_message: message
  });
  if (error) return { error: error.message };
  return { unlockId: data ?? undefined };
}

/** Pending unlocks for me — the "someone discovered you" alert. */
export async function matchmakerIncoming(): Promise<{
  unlocks: MatchmakerIncoming[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('matchmaker_incoming');
  if (error) return { unlocks: [], error: error.message };
  return { unlocks: data ?? [] };
}

/** Accept (chat opens, both can talk) or decline (silent end + sender's gift). */
export async function matchmakerRespondUnlock(
  unlockId: string,
  accept: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('matchmaker_respond_unlock', {
    p_unlock_id: unlockId,
    p_accept: accept
  });
  if (error) return { error: error.message };
  return {};
}

export interface MatchmakerHistoryBoard {
  id: string;
  status: 'won' | 'lost';
  strikes: number;
  matches_found: number;
  created_at: string;
  completed_at: string | null;
  unlocks: {
    id: string;
    recipient_id: string;
    display_name: string;
    photo_path: string | null;
    message: string;
    status: 'sent' | 'accepted' | 'declined';
    responded_at: string | null;
    conversation_id: string | null;
    consolation: { slug: string; name: string; emoji: string } | null;
  }[];
}

/** Past boards with unlock outcomes + the consolation gifts earned on declines. */
export async function matchmakerHistory(): Promise<{
  boards: MatchmakerHistoryBoard[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { boards: [] };

  const { data: boardRows, error } = await supabase
    .from('matchmaker_boards')
    .select('id, status, strikes, matches_found, created_at, completed_at')
    .eq('user_id', user.id)
    .in('status', ['won', 'lost'])
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return { boards: [], error: error.message };

  const boards = (boardRows ?? []) as {
    id: string;
    status: 'won' | 'lost';
    strikes: number;
    matches_found: number;
    created_at: string;
    completed_at: string | null;
  }[];
  const boardIds = boards.map((b) => b.id);

  const unlockRes =
    boardIds.length > 0
      ? await supabase
          .from('matchmaker_unlocks')
          .select(
            'id, board_id, recipient_id, message, status, responded_at, conversation_id, gift_inventory_id'
          )
          .eq('sender_id', user.id)
          .in('board_id', boardIds)
          .order('created_at', { ascending: true })
      : { data: [] };
  const recipientIds = Array.from(
    new Set((unlockRes.data ?? []).map((u) => u.recipient_id))
  );

  const [giftRows, profileRows] = await Promise.all([
    supabase
      .from('gift_inventory')
      .select('id, gift_catalog!inner(slug, name, emoji)')
      .eq('user_id', user.id)
      .filter('gift_catalog.matchmaker_only', 'eq', true),
    recipientIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', recipientIds)
      : { data: [] }
  ]);

  const giftByInv = new Map(
    (giftRows.data ?? []).map((g) => [
      g.id,
      {
        slug: g.gift_catalog?.slug ?? '',
        name: g.gift_catalog?.name ?? 'Matchmaker gift',
        emoji: g.gift_catalog?.emoji ?? '🎁'
      }
    ])
  );
  const profileMap = new Map(
    (profileRows.data ?? []).map((p) => [
      p.id,
      {
        display_name: p.display_name,
        photo_path: p.photos?.[0]?.storage_path ?? null
      }
    ])
  );

  const rows = (unlockRes.data ?? []) as {
    id: string;
    board_id: string;
    recipient_id: string;
    message: string;
    status: 'sent' | 'accepted' | 'declined';
    responded_at: string | null;
    conversation_id: string | null;
    gift_inventory_id: string | null;
  }[];

  const byBoard = new Map<string, MatchmakerHistoryBoard['unlocks']>();
  for (const u of rows) {
    const entry = {
      id: u.id,
      recipient_id: u.recipient_id,
      display_name: profileMap.get(u.recipient_id)?.display_name ?? 'Member',
      photo_path: profileMap.get(u.recipient_id)?.photo_path ?? null,
      message: u.message,
      status: u.status,
      responded_at: u.responded_at,
      conversation_id: u.conversation_id,
      consolation: u.gift_inventory_id
        ? (giftByInv.get(u.gift_inventory_id) ?? null)
        : null
    };
    byBoard.set(u.board_id, [...(byBoard.get(u.board_id) ?? []), entry]);
  }

  return {
    boards: boards.map((b) => ({
      ...b,
      unlocks: byBoard.get(b.id) ?? []
    }))
  };
}
