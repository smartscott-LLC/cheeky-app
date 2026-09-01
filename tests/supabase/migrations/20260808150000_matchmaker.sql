-- Matchmaker (2026-08-08) — the memory-game spark mode. PRD: docs/PRD-matchmaker.md.
-- Sibling to L³ under the Spark hub (/browse). A 4×4 board (8 people, 2 cards
-- each); matching a pair unlocks ONE first-impression message to that person,
-- even if they never liked back. 2 matches win; 3 strikes lose. Unlock
-- messages ride their own allowance (never the 5-new-conversations cap); the
-- plays/day dial is 2/3/4/5 by floor via the matchmaker: rate-limit namespace.
--
-- The decline economy (founder): the sender is told a decline happened, but
-- the outcome is wrapped in a win — a Matchmaker-exclusive gift (one per
-- floor, unpurchasable) lands in their inventory, re-giftable like any gift.
-- Accepting an unlock grants the RECIPIENT the sender-floor variant, so
-- cross-floor accepts become collectible pulls. Wins are messages + gifts;
-- losses stay quiet. All writes via security-definer RPCs.

-- ============================================================
-- EXCLUSIVE GIFTS — one Matchmaker variant per floor, never purchasable
-- ============================================================
alter table public.gift_catalog
  add column if not exists matchmaker_only boolean not null default false;

insert into public.gift_catalog (slug, name, emoji, floor, token_cost, kind, matchmaker_only) values
  ('matchmaker_silver', 'The First Spark', '🔥', 'silver', 25, 'mini', true),
  ('matchmaker_gold', 'The Golden Ticket', '🎫', 'gold', 50, 'mini', true),
  ('matchmaker_platinum', 'The Platinum Pass', '💠', 'platinum', 100, 'mini', true),
  ('matchmaker_diamond', 'The Diamond Key', '🗝️', 'diamond', 200, 'mini', true)
on conflict (slug) do nothing;

-- buy_gift refuses exclusive gifts — they're earned, never sold.
create or replace function public.buy_gift(p_slug text)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_floor text;
  v_balance int;
  v_holds int;
  v_inv uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if exists (
    select 1 from public.gift_catalog
    where slug = p_slug and matchmaker_only
  ) then
    raise exception 'gift_not_purchasable';
  end if;

  select token_cost, floor into v_cost, v_floor
  from public.gift_catalog
  where slug = p_slug and active;
  if v_cost is null then
    raise exception 'gift_not_found';
  end if;

  -- Buy down, never up: your tier must reach the gift's floor.
  if public.tier_rank(public.current_tier(v_user)) < public.tier_rank(v_floor) then
    raise exception 'tier_required';
  end if;

  -- Available = ledger balance - active event holds.
  select coalesce(sum(delta), 0) into v_balance
  from public.token_ledger
  where user_id = v_user;

  select coalesce(sum(e.token_cost), 0) into v_holds
  from public.event_entries ee
  join public.events e on e.id = ee.event_id
  where ee.user_id = v_user and ee.status = 'reserved';

  if v_balance - v_holds < v_cost then
    raise exception 'insufficient_tokens';
  end if;

  insert into public.token_ledger (user_id, delta, reason, ref)
  values (v_user, -v_cost, 'gift_purchase', null);

  insert into public.gift_inventory (user_id, catalog_id, status)
  values (v_user, (select id from public.gift_catalog where slug = p_slug), 'available')
  returning id into v_inv;

  return v_inv;
end;
$$;

grant execute on function public.buy_gift(text) to authenticated;

-- ============================================================
-- MATCHMAKER_BOARDS — one row per play; the state machine lives here
-- ============================================================
create table public.matchmaker_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'drafting'
    check (status in ('drafting', 'live', 'won', 'lost')),
  strikes smallint not null default 0 check (strikes between 0 and 3),
  matches_found smallint not null default 0 check (matches_found between 0 and 2),
  -- First card of the current pair attempt (face-up awaiting its mate).
  flipped_card_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.matchmaker_boards enable row level security;
create policy "Read your own boards"
  on public.matchmaker_boards for select
  using (user_id = auth.uid());

create index matchmaker_boards_user_status_idx
  on public.matchmaker_boards (user_id, status);

-- ============================================================
-- MATCHMAKER_DRAFTS — the phase-1 picks (swipes, not real likes)
-- ============================================================
create table public.matchmaker_drafts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.matchmaker_boards(id) on delete cascade not null,
  target_id uuid references auth.users(id) on delete cascade not null,
  picked_at timestamptz not null default now(),
  unique (board_id, target_id)
);

-- Deny-all: drafts are internal to the board builder; no client read path.
alter table public.matchmaker_drafts enable row level security;

create index matchmaker_drafts_board_idx
  on public.matchmaker_drafts (board_id);

-- ============================================================
-- MATCHMAKER_CARDS — 16 face-down cards (8 people × 2 copies)
-- ============================================================
create table public.matchmaker_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.matchmaker_boards(id) on delete cascade not null,
  pair_id uuid not null,             -- two cards share one pair_id (one person)
  target_id uuid references auth.users(id) on delete cascade not null,
  card_position smallint not null check (card_position between 1 and 16),
  is_stake boolean not null default false,
  matched boolean not null default false,
  unique (board_id, card_position)
);

-- Deny-all select: cards reveal target identities ONLY via the flip RPC, so
-- the board is honest chance — no client-side peeking at who's where.
alter table public.matchmaker_cards enable row level security;

create index matchmaker_cards_board_idx
  on public.matchmaker_cards (board_id);

alter table public.matchmaker_boards
  add constraint matchmaker_boards_flipped_card_fk
  foreign key (flipped_card_id) references public.matchmaker_cards(id)
  on delete set null;

-- ============================================================
-- MATCHMAKER_UNLOCKS — earned first impressions + the accept/decline flow
-- ============================================================
create table public.matchmaker_unlocks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.matchmaker_boards(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  -- The sender's floor at send time — drives which exclusive gift variant
  -- lands (accept: recipient gets this floor's; decline: sender gets it).
  sender_floor text not null check (sender_floor in ('silver', 'gold', 'platinum', 'diamond')),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'declined')),
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (board_id, recipient_id)
);

alter table public.matchmaker_unlocks enable row level security;
create policy "Read unlocks you sent or received"
  on public.matchmaker_unlocks for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create index matchmaker_unlocks_recipient_status_idx
  on public.matchmaker_unlocks (recipient_id, status);
create index matchmaker_unlocks_board_idx
  on public.matchmaker_unlocks (board_id);

-- ============================================================
-- MATCHMAKER_AWARD_GIFT — internal: drops a floor's exclusive gift into
-- inventory (available, re-giftable). Not member-callable.
-- ============================================================
create or replace function public.matchmaker_award_gift(p_user uuid, p_floor text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_catalog uuid;
begin
  select id into v_catalog
  from public.gift_catalog
  where slug = 'matchmaker_' || p_floor
    and matchmaker_only
    and active;
  if v_catalog is null then
    raise exception 'matchmaker_gift_missing';
  end if;

  insert into public.gift_inventory (user_id, catalog_id, status)
  values (p_user, v_catalog, 'available');
end;
$$;

revoke execute on function public.matchmaker_award_gift(uuid, text) from anon, public, authenticated;

-- ============================================================
-- MATCHMAKER_START_DRAFT — open (or resume) the phase-1 draft board
-- ============================================================
create or replace function public.matchmaker_start_draft()
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_user and verified_at is not null
  ) then
    raise exception 'verify_required';
  end if;

  select id into v_board
  from public.matchmaker_boards
  where user_id = v_user and status in ('drafting', 'live')
  order by created_at desc
  limit 1;

  if v_board is not null then
    return v_board;
  end if;

  insert into public.matchmaker_boards (user_id)
  values (v_user)
  returning id into v_board;

  return v_board;
end;
$$;

grant execute on function public.matchmaker_start_draft() to authenticated;

-- ============================================================
-- MATCHMAKER_PICK_DRAFT — phase-1 swipe: your floor or beneath, compatible
-- ============================================================
create or replace function public.matchmaker_pick_draft(p_target uuid)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board uuid;
  v_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_board
  from public.matchmaker_boards
  where user_id = v_user and status = 'drafting'
  order by created_at desc
  limit 1;
  if v_board is null then
    raise exception 'no_draft_in_progress';
  end if;

  select count(*) into v_count
  from public.matchmaker_drafts
  where board_id = v_board;
  if v_count >= 2 then
    raise exception 'draft_full';
  end if;

  if p_target = v_user then
    raise exception 'cannot_draft_self';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_target and verified_at is not null and bot_flagged_at is null
  ) then
    raise exception 'invalid_target';
  end if;

  -- Drafts are from your floor or beneath (no paid-floor peeks while swiping).
  if public.tier_rank(public.current_tier(p_target)) > public.tier_rank(public.current_tier(v_user)) then
    raise exception 'floor_too_high';
  end if;

  if not public.compatible(v_user, p_target) then
    raise exception 'not_compatible';
  end if;

  if exists (
    select 1 from public.profiles me, public.profiles them
    where me.id = v_user and them.id = p_target
      and them.test_member and not me.test_member
  ) then
    raise exception 'invalid_target';
  end if;

  if exists (
    select 1 from public.likes
    where liker_id = v_user and likee_id = p_target
  ) then
    raise exception 'already_liked';
  end if;

  if exists (
    select 1 from public.matches
    where user_id_a = least(v_user, p_target)
      and user_id_b = greatest(v_user, p_target)
  ) then
    raise exception 'already_matched';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_user and blocked_id = p_target)
       or (blocker_id = p_target and blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;

  if not exists (
    select 1 from public.photos
    where user_id = p_target and held_at is null
  ) then
    raise exception 'no_photo';
  end if;

  insert into public.matchmaker_drafts (board_id, target_id)
  values (v_board, p_target)
  on conflict (board_id, target_id) do nothing;
end;
$$;

grant execute on function public.matchmaker_pick_draft(uuid) to authenticated;

-- ============================================================
-- MATCHMAKER_START_BOARD — consume a play, resolve real mutuals, build 16
-- cards (2 stakes × 2 + 6 randoms × 2, any floor, compatible pool)
-- ============================================================
create or replace function public.matchmaker_start_board()
returns table (
  board_id uuid,
  status text,
  strikes int,
  matches_found int,
  card_id uuid,
  card_position smallint,
  is_stake boolean,
  matched boolean
)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board public.matchmaker_boards%rowtype;
  v_plays int;
  v_ok boolean;
  v_stakes int;
  v_positions int[] := '{}';
  v_idx int := 1;
  v_pair uuid;
  v_rec record;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_board
  from public.matchmaker_boards b
  where b.user_id = v_user and b.status = 'drafting'
  order by b.created_at desc
  limit 1;
  if v_board.id is null then
    raise exception 'no_draft_in_progress';
  end if;

  if (select count(*) from public.matchmaker_drafts d where d.board_id = v_board.id) < 2 then
    raise exception 'need_two_drafts';
  end if;

  -- The plays dial (PRD §5): silver 2, gold 3, platinum 4, diamond 5.
  v_plays := case public.current_tier(v_user)
    when 'gold' then 3
    when 'platinum' then 4
    when 'diamond' then 5
    else 2
  end;
  v_ok := public.bump_rate_limit('matchmaker:plays:' || v_user, 86400, v_plays);
  if not v_ok then
    raise exception 'daily_plays_limit';
  end if;

  -- Real mutuals: a draft who already liked you surfaces as a normal match
  -- and leaves the board (PRD §4) — the board refills with randoms.
  for v_rec in (
    select d.target_id
    from public.matchmaker_drafts d
    where d.board_id = v_board.id
  ) loop
    if exists (
      select 1 from public.likes
      where liker_id = v_rec.target_id and likee_id = v_user
    ) then
      insert into public.matches (user_id_a, user_id_b, source)
      values (least(v_user, v_rec.target_id), greatest(v_user, v_rec.target_id), 'matchmaker')
      on conflict (user_id_a, user_id_b) do nothing;
      delete from public.matchmaker_drafts d
      where d.board_id = v_board.id and d.target_id = v_rec.target_id;
    end if;
  end loop;

  select count(*) into v_stakes
  from public.matchmaker_drafts d
  where d.board_id = v_board.id;

  select array_agg(g order by random()) into v_positions
  from generate_series(1, 16) as g;

  -- Stakes first (the user's own picks), then randoms fill the board.
  for v_rec in (
    select d.target_id
    from public.matchmaker_drafts d
    where d.board_id = v_board.id
    order by d.picked_at
  ) loop
    v_pair := gen_random_uuid();
    insert into public.matchmaker_cards (board_id, pair_id, target_id, card_position, is_stake)
    values
      (v_board.id, v_pair, v_rec.target_id, v_positions[v_idx], true),
      (v_board.id, v_pair, v_rec.target_id, v_positions[v_idx + 1], true);
    v_idx := v_idx + 2;
  end loop;

  for v_rec in (
    select p.id
    from public.profiles p
    where p.id <> v_user
      and p.verified_at is not null
      and p.bot_flagged_at is null
      and (not p.test_member or exists (
        select 1 from public.profiles me
        where me.id = v_user and me.test_member
      ))
      and public.compatible(v_user, p.id)
      and not exists (
        select 1 from public.likes l
        where l.liker_id = v_user and l.likee_id = p.id
      )
      and not exists (
        select 1 from public.matches m
        where m.user_id_a = least(v_user, p.id)
          and m.user_id_b = greatest(v_user, p.id)
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v_user and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = v_user)
      )
      and not exists (
        select 1 from public.matchmaker_drafts d
        where d.board_id = v_board.id and d.target_id = p.id
      )
      and exists (
        select 1 from public.photos ph
        where ph.user_id = p.id and ph.held_at is null
      )
    order by random()
    limit greatest(0, 8 - v_stakes)
  ) loop
    v_pair := gen_random_uuid();
    insert into public.matchmaker_cards (board_id, pair_id, target_id, card_position, is_stake)
    values
      (v_board.id, v_pair, v_rec.id, v_positions[v_idx], false),
      (v_board.id, v_pair, v_rec.id, v_positions[v_idx + 1], false);
    v_idx := v_idx + 2;
  end loop;

  update public.matchmaker_boards
  set status = 'live', flipped_card_id = null
  where id = v_board.id;

  return query
  select v_board.id, 'live'::text, 0, 0, c.id, c.card_position, c.is_stake, c.matched
  from public.matchmaker_cards c
  where c.board_id = v_board.id
  order by c.card_position;
end;
$$;

grant execute on function public.matchmaker_start_board() to authenticated;

-- ============================================================
-- MATCHMAKER_FLIP — reveal a card; resolve match / strike on the second flip
-- ============================================================
create or replace function public.matchmaker_flip(p_card_id uuid)
returns table (
  card_id uuid,
  card_position smallint,
  is_stake boolean,
  is_match boolean,
  first_card_id uuid,
  target_id uuid,
  display_name text,
  photo_path text,
  strikes int,
  matches_found int,
  board_status text
)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board public.matchmaker_boards%rowtype;
  v_card public.matchmaker_cards%rowtype;
  v_first public.matchmaker_cards%rowtype;
  v_matches int;
  v_strikes int;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select b.* into v_board
  from public.matchmaker_boards b
  join public.matchmaker_cards c on c.board_id = b.id
  where c.id = p_card_id and b.user_id = v_user;
  if v_board.id is null then
    raise exception 'board_not_found';
  end if;
  if v_board.status <> 'live' then
    raise exception 'board_not_live';
  end if;

  select * into v_card
  from public.matchmaker_cards
  where id = p_card_id;
  if v_card.matched then
    raise exception 'card_already_matched';
  end if;
  if v_board.flipped_card_id = v_card.id then
    raise exception 'card_already_flipped';
  end if;

  if v_board.flipped_card_id is null then
    -- First flip of the attempt: reveal only, hold the card face-up.
    update public.matchmaker_boards
    set flipped_card_id = p_card_id
    where id = v_board.id;

    return query
    select
      p_card_id,
      v_card.card_position,
      v_card.is_stake,
      null::boolean,
      null::uuid,
      v_card.target_id,
      p.display_name,
      (select ph.storage_path
       from public.photos ph
       where ph.user_id = p.id and ph.held_at is null
       order by ph.is_primary desc, ph.position
       limit 1),
      v_board.strikes::int,
      v_board.matches_found::int,
      'live'::text
    from public.profiles p
    where p.id = v_card.target_id;

    return;
  end if;

  select * into v_first
  from public.matchmaker_cards
  where id = v_board.flipped_card_id;

  if v_first.pair_id = v_card.pair_id then
    -- MATCH — both cards stay face-up; unlock earned for that person.
    v_matches := v_board.matches_found + 1;
    update public.matchmaker_cards
    set matched = true
    where board_id = v_board.id and pair_id = v_card.pair_id;
    update public.matchmaker_boards
    set matches_found = v_matches,
        flipped_card_id = null,
        status = case when v_matches >= 2 then 'won' else 'live' end,
        completed_at = case when v_matches >= 2 then now() else null end
    where id = v_board.id;

    return query
    select
      p_card_id,
      v_card.card_position,
      v_card.is_stake,
      true,
      v_first.id,
      v_card.target_id,
      p.display_name,
      (select ph.storage_path
       from public.photos ph
       where ph.user_id = p.id and ph.held_at is null
       order by ph.is_primary desc, ph.position
       limit 1),
      v_board.strikes::int,
      v_matches,
      case when v_matches >= 2 then 'won' else 'live' end
    from public.profiles p
    where p.id = v_card.target_id;

    return;
  else
    -- STRIKE — both cards go back face-down.
    v_strikes := v_board.strikes + 1;
    update public.matchmaker_boards
    set strikes = v_strikes,
        flipped_card_id = null,
        status = case when v_strikes >= 3 then 'lost' else 'live' end,
        completed_at = case when v_strikes >= 3 then now() else null end
    where id = v_board.id;

    return query
    select
      p_card_id,
      v_card.card_position,
      v_card.is_stake,
      false,
      v_first.id,
      v_card.target_id,
      p.display_name,
      (select ph.storage_path
       from public.photos ph
       where ph.user_id = p.id and ph.held_at is null
       order by ph.is_primary desc, ph.position
       limit 1),
      v_strikes,
      v_board.matches_found::int,
      case when v_strikes >= 3 then 'lost' else 'live' end
    from public.profiles p
    where p.id = v_card.target_id;

    return;
  end if;
end;
$$;

grant execute on function public.matchmaker_flip(uuid) to authenticated;

-- ============================================================
-- MATCHMAKER_SEND_UNLOCK — write the first-impression message for a matched
-- pair. Rides its own allowance: no conversation, no message cap touched.
-- ============================================================
create or replace function public.matchmaker_send_unlock(p_card_id uuid, p_message text)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board public.matchmaker_boards%rowtype;
  v_card public.matchmaker_cards%rowtype;
  v_floor text;
  v_unlock uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(p_message) < 1 or char_length(p_message) > 2000 then
    raise exception 'invalid_message_length';
  end if;

  select b.* into v_board
  from public.matchmaker_boards b
  join public.matchmaker_cards c on c.board_id = b.id
  where c.id = p_card_id and b.user_id = v_user;
  if v_board.id is null then
    raise exception 'board_not_found';
  end if;
  if v_board.status not in ('live', 'won', 'lost') then
    raise exception 'board_not_playable';
  end if;

  select * into v_card
  from public.matchmaker_cards
  where id = p_card_id;
  if not v_card.matched then
    raise exception 'card_not_matched';
  end if;

  if exists (
    select 1 from public.matchmaker_unlocks
    where board_id = v_board.id and recipient_id = v_card.target_id
  ) then
    raise exception 'unlock_already_sent';
  end if;

  v_floor := public.current_tier(v_user);
  if v_floor not in ('silver', 'gold', 'platinum', 'diamond') then
    v_floor := 'silver';
  end if;

  insert into public.matchmaker_unlocks (board_id, sender_id, recipient_id, sender_floor, message)
  values (v_board.id, v_user, v_card.target_id, v_floor, p_message)
  returning id into v_unlock;

  return v_unlock;
end;
$$;

grant execute on function public.matchmaker_send_unlock(uuid, text) to authenticated;

-- ============================================================
-- MATCHMAKER_INCOMING — pending unlocks for me (the recipient alert)
-- ============================================================
create or replace function public.matchmaker_incoming()
returns table (
  unlock_id uuid,
  sender_id uuid,
  display_name text,
  photo_path text,
  message text,
  created_at timestamptz
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  return query
  select
    u.id,
    u.sender_id,
    p.display_name,
    (select ph.storage_path
     from public.photos ph
     where ph.user_id = p.id and ph.held_at is null
     order by ph.is_primary desc, ph.position
     limit 1),
    u.message,
    u.created_at
  from public.matchmaker_unlocks u
  join public.profiles p on p.id = u.sender_id
  where u.recipient_id = v_user and u.status = 'sent'
  order by u.created_at desc;
end;
$$;

grant execute on function public.matchmaker_incoming() to authenticated;

-- ============================================================
-- MATCHMAKER_RESPOND_UNLOCK — accept (chat opens, both can talk, recipient
-- gets the sender-floor gift) or decline (silent end; sender gets their own
-- floor's gift as the consolation — the rebound).
-- ============================================================
create or replace function public.matchmaker_respond_unlock(p_unlock_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_unlock public.matchmaker_unlocks%rowtype;
  v_conv uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_unlock
  from public.matchmaker_unlocks
  where id = p_unlock_id and recipient_id = v_user and status = 'sent'
  for update;
  if v_unlock.id is null then
    raise exception 'unlock_not_found';
  end if;

  if p_accept then
    v_conv := public.get_or_create_conversation(v_unlock.sender_id);

    insert into public.messages (conversation_id, sender_id, body)
    values (v_conv, v_unlock.sender_id, v_unlock.message);

    -- Acceptance is consent: the pair is now a real match, so the thread
    -- flows through the normal messaging stack (both can talk; the unlock
    -- message already lives in the conversation for retention-purge).
    insert into public.matches (user_id_a, user_id_b, source)
    values (least(v_user, v_unlock.sender_id), greatest(v_user, v_unlock.sender_id), 'matchmaker')
    on conflict (user_id_a, user_id_b) do nothing;

    -- The collectible pull: accepting from another floor earns its variant.
    perform public.matchmaker_award_gift(v_user, v_unlock.sender_floor);

    update public.matchmaker_unlocks
    set status = 'accepted', conversation_id = v_conv, responded_at = now()
    where id = p_unlock_id;
  else
    -- Silent end for the recipient; the sender gets the consolation gift —
    -- "they declined, but you still won the game" (the rebound, PRD §6).
    perform public.matchmaker_award_gift(v_unlock.sender_id, v_unlock.sender_floor);

    update public.matchmaker_unlocks
    set status = 'declined', responded_at = now()
    where id = p_unlock_id;
  end if;
end;
$$;

grant execute on function public.matchmaker_respond_unlock(uuid, boolean) to authenticated;

-- ============================================================
-- MATCHMAKER_BOARD_CARDS — the client's only window into a live board:
-- positions + stakes + which cards are face-up (matched or the current
-- flip). Target identities are revealed ONLY by matchmaker_flip.
-- ============================================================
create or replace function public.matchmaker_board_cards(p_board_id uuid)
returns table (
  id uuid,
  card_position smallint,
  is_stake boolean,
  matched boolean,
  target_id uuid,
  display_name text,
  photo_path text
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board public.matchmaker_boards%rowtype;
begin
  if v_user is null then
    return;
  end if;

  select * into v_board
  from public.matchmaker_boards b
  where b.id = p_board_id and b.user_id = v_user;
  if v_board.id is null then
    return;
  end if;

  return query
  select
    c.id,
    c.card_position,
    c.is_stake,
    c.matched,
    case
      when c.matched or c.id = v_board.flipped_card_id then c.target_id
      else null
    end,
    case
      when c.matched or c.id = v_board.flipped_card_id then p.display_name
      else null
    end,
    case
      when c.matched or c.id = v_board.flipped_card_id then
        (select ph.storage_path
         from public.photos ph
         where ph.user_id = p.id and ph.held_at is null
         order by ph.is_primary desc, ph.position
         limit 1)
      else null
    end
  from public.matchmaker_cards c
  join public.profiles p on p.id = c.target_id
  where c.board_id = p_board_id
  order by c.card_position;
end;
$$;

grant execute on function public.matchmaker_board_cards(uuid) to authenticated;

-- ============================================================
-- TASKBAR_STATE — the plays dial is live: plays left today (2/3/4/5).
-- ============================================================
create or replace function public.taskbar_state()
returns table (
  tier text,
  messages_sent_today bigint,
  new_people_today bigint,
  checked_in_today boolean,
  matchmaker_plays_left int,
  blind_date_joins_today bigint,
  gift_ready boolean,
  gift_ready_in_minutes int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last_gift timestamptz;
begin
  if v_user is null then
    return;
  end if;
  return query
  select
    public.current_tier(v_user) as tier,
    (
      select count(*) from public.messages m
      where m.sender_id = v_user
        and m.created_at >= date_trunc('day', now())
    ) as messages_sent_today,
    (
      select count(distinct
          case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id = v_user
        and m.created_at >= date_trunc('day', now())
        and not exists (
          select 1 from public.matches mt
          where mt.user_id_a = least(v_user, case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
            and mt.user_id_b = greatest(v_user, case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
        )
    ) as new_people_today,
    exists (
      select 1 from public.daily_checkins
      where user_id = v_user and day = current_date
    ) as checked_in_today,
    -- Plays LEFT today (the 2/3/4/5 dial), backed by the matchmaker:
    -- rate-limit bucket the game itself consumes.
    greatest(0, (
      case public.current_tier(v_user)
        when 'gold' then 3
        when 'platinum' then 4
        when 'diamond' then 5
        else 2
      end
      - coalesce((
        select r.calls
        from public.rate_limits r
        where r.key = 'matchmaker:plays:' || v_user
          and r.bucket_start > now() - interval '24 hours'
      ), 0)
    ))::int as matchmaker_plays_left,
    (
      select count(*) from public.event_entries ee
      join public.events e on e.id = ee.event_id
      where ee.user_id = v_user
        and e.kind = 'blind_date'
        and ee.created_at >= date_trunc('day', now())
    ) as blind_date_joins_today,
    not exists (
      select 1 from public.gift_sends
      where sender_id = v_user and sent_at > now() - interval '1 hour'
    ) as gift_ready,
    case
      when exists (
        select 1 from public.gift_sends
        where sender_id = v_user and sent_at > now() - interval '1 hour'
      ) then greatest(1, ceil(extract(epoch from ((
          select max(gs.sent_at) from public.gift_sends gs
          where gs.sender_id = v_user and gs.sent_at > now() - interval '1 hour'
        ) + interval '1 hour' - now())) / 60)::int)
      else 0
    end as gift_ready_in_minutes;
end;
$$;

grant execute on function public.taskbar_state() to authenticated;
