-- Fix (2026-08-08, found by tests/matchmaker.live.test.mjs): RETURNS TABLE
-- output parameters are in-scope variables, so bare column references that
-- collide with an output param name ("id", "status", "board_id") raised
-- 42702 "column reference is ambiguous" inside three Matchmaker RPCs.
-- Every internal reference is now alias-qualified.

-- ============================================================
-- MATCHMAKER_DRAFT_CANDIDATES — fixed board lookup
-- ============================================================
create or replace function public.matchmaker_draft_candidates()
returns table (
  id uuid,
  display_name text,
  bio text,
  one_liner text,
  gender text,
  interested_in text,
  photo_path text,
  picked boolean
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board uuid;
begin
  if v_user is null then
    return;
  end if;

  select b.id into v_board
  from public.matchmaker_boards b
  where b.user_id = v_user and b.status = 'drafting'
  order by b.created_at desc
  limit 1;

  return query
  select
    p.id,
    p.display_name,
    p.bio,
    p.one_liner,
    p.gender,
    p.interested_in,
    (select ph.storage_path
     from public.photos ph
     where ph.user_id = p.id and ph.held_at is null
     order by ph.is_primary desc, ph.position
     limit 1) as photo_path,
    exists (
      select 1 from public.matchmaker_drafts d
      where d.board_id = v_board and d.target_id = p.id
    ) as picked
  from public.profiles p
  where p.id <> v_user
    and p.verified_at is not null
    and p.bot_flagged_at is null
    and (not p.test_member or exists (
      select 1 from public.profiles me
      where me.id = v_user and me.test_member
    ))
    and public.tier_rank(public.current_tier(p.id)) <= public.tier_rank(public.current_tier(v_user))
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
    and exists (
      select 1 from public.photos ph
      where ph.user_id = p.id and ph.held_at is null
    )
  order by picked desc, random()
  limit 12;
end;
$$;

grant execute on function public.matchmaker_draft_candidates() to authenticated;

-- ============================================================
-- MATCHMAKER_START_BOARD — fixed board lookup, count, and delete
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
-- MATCHMAKER_BOARD_CARDS — fixed board lookup
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
