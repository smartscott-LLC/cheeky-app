-- The Floor Playlist (Phase 4): every floor's signature event runs HOURLY,
-- staggered across the hour so higher tiers never choose — they stack.
--   :00 The Dance Floor  (Silver,   3 tokens)
--   :15 Themed Night     (Gold,     5 tokens)
--   :30 Speed Dating     (Platinum, 25 tokens)
--   :45 The Rooftop      (Diamond,  40 tokens)
-- The Dance Floor remains the reference event; the other grid rooms
-- (themed_night, rooftop) reskin it with their own ticket.

-- ============================================================
-- ONE SCHEDULER: create the next N hours of all four rooms
-- ============================================================
create or replace function public.ensure_floor_events(p_hours int default 2)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_anchor timestamptz := date_trunc('hour', now());
  i int;
begin
  for i in 0 .. p_hours - 1 loop
    -- :00 — The Dance Floor (Silver)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('dance_floor', 'silver', v_anchor + make_interval(hours => i), 'open', 3, 20)
    on conflict (kind, starts_at) do nothing;
    -- :15 — Themed Night (Gold)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('themed_night', 'gold', v_anchor + make_interval(hours => i, mins => 15), 'open', 5, 8)
    on conflict (kind, starts_at) do nothing;
    -- :30 — Speed Dating (Platinum)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('speed_dating', 'platinum', v_anchor + make_interval(hours => i, mins => 30), 'open', 25, 4)
    on conflict (kind, starts_at) do nothing;
    -- :45 — The Rooftop (Diamond)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('rooftop', 'diamond', v_anchor + make_interval(hours => i, mins => 45), 'open', 40, 6)
    on conflict (kind, starts_at) do nothing;
  end loop;
end;
$$;

grant execute on function public.ensure_floor_events(int) to authenticated;

-- ============================================================
-- CRON: retire the two old schedulers, adopt the playlist.
-- The old 6-hour cron pre-created speed-dating slots at :00 —
-- clear any open ones so only the new :30 slots run.
-- ============================================================
select cron.unschedule('cheeky_ensure_events');
select cron.unschedule('cheeky_ensure_speed_dating');

delete from public.events
where kind = 'speed_dating'
  and status = 'open'
  and extract(minute from starts_at) <> 30;

select cron.schedule('cheeky_ensure_floor_events', '5 * * * *',
  $$ select public.ensure_floor_events(2) $$);

-- ============================================================
-- PICK_ON_FLOOR: grid mechanics, per-room ticket. Read the
-- event's own cost + kind instead of hardcoding Dance Floor / 3.
-- ============================================================
create or replace function public.pick_on_floor(p_event_id uuid, p_pickee uuid)
returns table (matched boolean, match_id uuid)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event_status text;
  v_cost int;
  v_kind text;
  v_entry_status text;
  v_pickee_status text;
  v_picks int;
  v_match uuid;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_user = p_pickee then
    raise exception 'cannot_pick_self';
  end if;

  select status, token_cost, kind into v_event_status, v_cost, v_kind
  from public.events where id = p_event_id;
  if v_event_status is null then
    raise exception 'event_not_found';
  end if;
  if v_event_status <> 'running' then
    raise exception 'round_not_active';
  end if;

  select status into v_entry_status
  from public.event_entries
  where event_id = p_event_id and user_id = v_user;
  if v_entry_status is null or v_entry_status <> 'reserved' then
    raise exception 'not_in_round';
  end if;

  select status into v_pickee_status
  from public.event_entries
  where event_id = p_event_id and user_id = p_pickee;
  if v_pickee_status is null or v_pickee_status <> 'reserved' then
    raise exception 'pickee_unavailable';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_user and blocked_id = p_pickee)
       or (blocker_id = p_pickee and blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;

  select count(*) into v_picks
  from public.event_picks
  where event_id = p_event_id and picker_id = v_user;
  if v_picks >= 10 then
    raise exception 'pick_budget_exceeded';
  end if;

  insert into public.event_picks (event_id, picker_id, pickee_id)
  values (p_event_id, v_user, p_pickee)
  on conflict (event_id, picker_id, pickee_id) do nothing;

  v_pair_a := least(v_user, p_pickee);
  v_pair_b := greatest(v_user, p_pickee);

  -- Mutual pick? (and not blocked by a recent decline — no re-pairing)
  if exists (
    select 1 from public.event_picks
    where event_id = p_event_id
      and picker_id = p_pickee
      and pickee_id = v_user
  ) and not exists (
    select 1 from public.matches m
    where m.user_id_a = v_pair_a
      and m.user_id_b = v_pair_b
      and m.status = 'declined'
      and m.created_at > now() - interval '24 hours'
  ) then
    insert into public.matches (user_id_a, user_id_b, source, status)
    values (v_pair_a, v_pair_b, v_kind, 'active')
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_match;

    -- Song chat conversation (reuses existing if they already talk).
    perform public.get_or_create_conversation(p_pickee);

    -- Convert both holds to spend, at this room's ticket price.
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (v_user, -v_cost, v_kind, v_match),
           (p_pickee, -v_cost, v_kind, v_match);

    update public.event_entries
    set status = 'locked'
    where event_id = p_event_id and user_id in (v_user, p_pickee);
  end if;

  return query select v_match is not null, v_match;
end;
$$;

grant execute on function public.pick_on_floor(uuid, uuid) to authenticated;

-- ============================================================
-- FINALIZE_EVENTS: the minute hand. Grid rooms (dance_floor,
-- themed_night, rooftop) share the 2-minute round; speed dating
-- keeps its rotation + resolution windows.
-- ============================================================
create or replace function public.finalize_events()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  e record;
begin
  -- Cancel low-fill open events that should have started.
  update public.events e
  set status = 'canceled'
  where e.status = 'open'
    and now() >= e.starts_at
    and (select count(*) from public.event_entries ee
         where ee.event_id = e.id and ee.status = 'reserved') < e.min_fill;

  -- Release holds on canceled events.
  update public.event_entries ee
  set status = 'canceled'
  from public.events e
  where e.id = ee.event_id
    and ee.status = 'reserved'
    and e.status = 'canceled';

  -- Start on-time events (min fill met) and prep speed dating.
  for e in
    select e.*,
      (select count(*) from public.event_entries ee
       where ee.event_id = e.id and ee.status = 'reserved') as fill
    from public.events e
    where e.status = 'open' and now() >= e.starts_at
  loop
    if e.fill >= e.min_fill then
      update public.events set status = 'running' where id = e.id;
      if e.kind = 'speed_dating' then
        perform public.setup_speed_dating(e.id);
      end if;
    end if;
  end loop;

  -- End grid rounds (2-min window): release unmatched holds, close the room.
  update public.event_entries ee
  set status = 'released'
  from public.events e
  where e.id = ee.event_id
    and ee.status = 'reserved'
    and e.status = 'running'
    and e.kind in ('dance_floor', 'themed_night', 'rooftop')
    and now() >= e.starts_at + interval '2 minutes';

  update public.events e
  set status = 'closed'
  where e.status = 'running'
    and e.kind in ('dance_floor', 'themed_night', 'rooftop')
    and now() >= e.starts_at + interval '2 minutes';

  -- End speed dating rotation: selection window opens for 3 minutes.
  for e in
    select e.*
    from public.events e
    where e.status = 'running' and e.kind = 'speed_dating'
      and now() >= e.starts_at + (select coalesce(max(slot_index), 0) + 1 from public.speed_sessions where event_id = e.id) * interval '90 seconds'
  loop
    update public.events set status = 'closed' where id = e.id;
  end loop;

  -- Resolve speed dating after the selection window.
  for e in
    select id from public.events
    where status = 'closed' and kind = 'speed_dating'
      and now() >= starts_at + interval '12 minutes'
  loop
    perform public.resolve_speed_dating(e.id);
    update public.events set status = 'canceled' where id = e.id and kind = 'speed_dating';
  end loop;
end;
$$;
