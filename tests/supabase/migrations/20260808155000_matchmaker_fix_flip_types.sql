-- Fix (2026-08-08, found by tests/matchmaker.live.test.mjs): matchmaker_flip
-- declared strikes/matches_found as int in RETURNS TABLE but returned
-- v_board.strikes / v_board.matches_found directly — the table columns are
-- smallint, so Postgres raised 42804 "Returned type smallint does not match
-- expected type integer". Cast to int in the return rows.

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
