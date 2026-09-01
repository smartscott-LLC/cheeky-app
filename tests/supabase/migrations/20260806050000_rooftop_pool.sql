-- The Rooftop becomes the multi-round pool (PRD-event-logic §5, 2026-08-06):
-- fast 10-second rounds, three picks each, mutuals match and are escorted
-- off the board (visible — the pool needs a board that shrinks). Rounds
-- repeat until everyone's matched; when exactly 2 remain the final 1v1
-- auto-matches. Closed bracket: the pool forms at the :45 start, no
-- mid-pool joining. Everyone who matches pays the 40 (no refunds — you're
-- gonna get paid); an odd leftover (literally no one left to pair with)
-- is refunded.
--
-- The minute hand (finalize_events) no longer touches rooftop — a dedicated
-- 10-second cron (cheeky_rooftop_tick) drives the pool clock.

-- ============================================================
-- POOL PICKS (round-scoped — event_picks has no round dimension)
-- ============================================================
create table if not exists public.rooftop_picks (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  round_index int not null,
  picker_id uuid references auth.users(id) on delete cascade not null,
  pickee_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (event_id, round_index, picker_id, pickee_id),
  check (picker_id <> pickee_id)
);

alter table public.rooftop_picks enable row level security;
drop policy if exists "Rooftop picks: read your own" on public.rooftop_picks;
create policy "Rooftop picks: read your own"
  on public.rooftop_picks for select using (picker_id = auth.uid());

-- ============================================================
-- ROUNDS (the board's clock — one row per 10-second round)
-- ============================================================
create table if not exists public.rooftop_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  round_index int not null,
  started_at timestamptz not null default now(),
  resolved boolean not null default false,
  unique (event_id, round_index)
);

alter table public.rooftop_rounds enable row level security;
drop policy if exists "Rooftop rounds are visible" on public.rooftop_rounds;
create policy "Rooftop rounds are visible"
  on public.rooftop_rounds for select using (true);

-- ============================================================
-- JOIN_EVENT — the pool caps at 10 (grid rooms stay uncapped)
-- ============================================================
create or replace function public.join_event(p_event_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_kind text;
  v_balance int;
  v_holds int;
  v_entry uuid;
  v_event_status text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Serialize this member's joins: the balance/holds read below must not
  -- interleave with another join by the same member.
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select status, token_cost, kind into v_event_status, v_cost, v_kind
  from public.events
  where id = p_event_id;

  if v_event_status is null then
    raise exception 'event_not_found';
  end if;
  if v_event_status <> 'open' then
    raise exception 'event_not_open';
  end if;

  if exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = v_user
  ) then
    raise exception 'already_joined';
  end if;

  -- The Rooftop pool is a closed bracket of 10.
  if v_kind = 'rooftop' and (
    select count(*) from public.event_entries
    where event_id = p_event_id and status = 'reserved'
  ) >= 10 then
    raise exception 'room_full';
  end if;

  -- Available = ledger balance - active holds.
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

  insert into public.event_entries (event_id, user_id, status)
  values (p_event_id, v_user, 'reserved')
  returning id into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.join_event(uuid) to authenticated;

-- ============================================================
-- SUBMIT_ROOFTOP_PICK — up to three picks per 10-second round
-- ============================================================
create or replace function public.submit_rooftop_pick(p_event_id uuid, p_round int, p_pickee uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event record;
  v_round record;
  v_pick_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_pickee = v_user then
    raise exception 'cannot_pick_self';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if v_event.kind <> 'rooftop' then
    raise exception 'wrong_kind';
  end if;
  if v_event.status <> 'running' then
    raise exception 'round_not_active';
  end if;

  select * into v_round
  from public.rooftop_rounds
  where event_id = p_event_id and resolved = false
  order by round_index desc
  limit 1;
  if v_round.id is null or v_round.round_index <> p_round then
    raise exception 'not_the_live_round';
  end if;

  if not exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = v_user and status = 'reserved'
  ) then
    raise exception 'not_in_pool';
  end if;
  if not exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = p_pickee and status = 'reserved'
  ) then
    raise exception 'pickee_unavailable';
  end if;

  select count(*) into v_pick_count
  from public.rooftop_picks
  where event_id = p_event_id and round_index = p_round and picker_id = v_user;
  if v_pick_count >= 3 then
    raise exception 'pick_budget_exceeded';
  end if;

  insert into public.rooftop_picks (event_id, round_index, picker_id, pickee_id)
  values (p_event_id, p_round, v_user, p_pickee)
  on conflict (event_id, round_index, picker_id, pickee_id) do nothing;
end;
$$;

grant execute on function public.submit_rooftop_pick(uuid, int, uuid) to authenticated;

-- ============================================================
-- AUTO_MATCH_ROOFTOP — the final 1v1: the last two standing match
-- ============================================================
create or replace function public.auto_match_rooftop(p_event_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_event record;
  v_a uuid;
  v_b uuid;
  v_pair_a uuid;
  v_pair_b uuid;
  v_match uuid;
begin
  select * into v_event from public.events where id = p_event_id;
  select user_id into v_a
  from public.event_entries
  where event_id = p_event_id and status = 'reserved'
  order by user_id
  limit 1;
  select user_id into v_b
  from public.event_entries
  where event_id = p_event_id and status = 'reserved'
  order by user_id
  limit 1 offset 1;
  if v_a is null or v_b is null then
    return;
  end if;

  v_pair_a := least(v_a, v_b);
  v_pair_b := greatest(v_a, v_b);
  insert into public.matches (user_id_a, user_id_b, source, status)
  values (v_pair_a, v_pair_b, 'rooftop', 'active')
  on conflict (user_id_a, user_id_b) do nothing
  returning id into v_match;

  if v_match is not null then
    insert into public.conversations (user_id_a, user_id_b)
    values (v_pair_a, v_pair_b)
    on conflict (user_id_a, user_id_b) do nothing;
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (v_a, -v_event.token_cost, 'rooftop', p_event_id::text),
           (v_b, -v_event.token_cost, 'rooftop', p_event_id::text);
  end if;

  update public.event_entries
  set status = 'locked'
  where event_id = p_event_id and user_id in (v_a, v_b) and status = 'reserved';
end;
$$;

-- ============================================================
-- TICK_ROOFTOP_EVENTS — the 10-second pool clock
-- ============================================================
create or replace function public.tick_rooftop_events()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_event record;
  v_round record;
  v_remaining int;
  r record;
  v_match uuid;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  for v_event in
    select * from public.events
    where status = 'running' and kind = 'rooftop'
  loop
    -- The board: who's still standing.
    select count(*)::int into v_remaining
    from public.event_entries
    where event_id = v_event.id and status = 'reserved';

    if v_remaining = 0 then
      update public.events set status = 'closed' where id = v_event.id;
      continue;
    end if;

    if v_remaining = 1 then
      -- Odd leftover: there is literally no one left to pair them with —
      -- refund, never charge what you can't win.
      update public.event_entries
      set status = 'released'
      where event_id = v_event.id and status = 'reserved';
      update public.events set status = 'closed' where id = v_event.id;
      continue;
    end if;

    if v_remaining = 2 then
      -- The final 1v1: you always wind up here — auto-match.
      perform public.auto_match_rooftop(v_event.id);
      update public.events set status = 'closed' where id = v_event.id;
      continue;
    end if;

    -- 3+ on the board: the round clock.
    select * into v_round
    from public.rooftop_rounds
    where event_id = v_event.id and resolved = false
    order by round_index desc
    limit 1;

    if v_round.id is null then
      insert into public.rooftop_rounds (event_id, round_index, started_at)
      values (v_event.id, 0, now())
      on conflict (event_id, round_index) do nothing;
      continue;
    end if;

    if now() < v_round.started_at + interval '10 seconds' then
      continue; -- the round is still live
    end if;

    -- Resolve the round: mutual picks match, couples are escorted off.
    for r in
      select p1.picker_id as a, p1.pickee_id as b
      from public.rooftop_picks p1
      join public.rooftop_picks p2
        on p2.event_id = p1.event_id
       and p2.round_index = p1.round_index
       and p2.picker_id = p1.pickee_id
       and p2.pickee_id = p1.picker_id
      where p1.event_id = v_event.id
        and p1.round_index = v_round.round_index
        and p1.picker_id < p1.pickee_id
      order by least(p1.created_at, p2.created_at)
    loop
      -- Already escorted off this round?
      if exists (
        select 1 from public.event_entries ee
        where ee.event_id = v_event.id
          and ee.user_id in (r.a, r.b)
          and ee.status = 'locked'
      ) then
        continue;
      end if;

      v_pair_a := least(r.a, r.b);
      v_pair_b := greatest(r.a, r.b);
      insert into public.matches (user_id_a, user_id_b, source, status)
      values (v_pair_a, v_pair_b, 'rooftop', 'active')
      on conflict (user_id_a, user_id_b) do nothing
      returning id into v_match;

      if v_match is not null then
        insert into public.conversations (user_id_a, user_id_b)
        values (v_pair_a, v_pair_b)
        on conflict (user_id_a, user_id_b) do nothing;
        insert into public.token_ledger (user_id, delta, reason, ref)
        values (r.a, -v_event.token_cost, 'rooftop', v_event.id::text),
               (r.b, -v_event.token_cost, 'rooftop', v_event.id::text);
      end if;

      update public.event_entries
      set status = 'locked'
      where event_id = v_event.id
        and user_id in (r.a, r.b)
        and status = 'reserved';
    end loop;

    update public.rooftop_rounds
    set resolved = true
    where id = v_round.id;

    insert into public.rooftop_rounds (event_id, round_index, started_at)
    values (v_event.id, v_round.round_index + 1, now())
    on conflict (event_id, round_index) do nothing;
  end loop;
end;
$$;

-- ============================================================
-- THE 10-SECOND CRON (idempotent)
-- ============================================================
do $$
begin
  begin
    perform cron.unschedule('cheeky_rooftop_tick');
  exception when others then
    null;
  end;
end $$;
select cron.schedule('cheeky_rooftop_tick', '*/10 * * * * *',
  $$ select public.tick_rooftop_events() $$);
