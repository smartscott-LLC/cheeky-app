-- Center Stage (Phase 5): the miss-streak rescue — the Encouraging
-- principle as code. Five consecutive grid rounds with no match, and the
-- member gets real visibility: a spotlight in the next grid. No fake likes,
-- no manufactured matches, and the streak itself stays private (silent loss,
-- public win).
--
-- Two tables: center_stage (public spotlight) + miss_streaks (private count).

-- ============================================================
-- CENTER STAGE (public — the grid reads who is spotlighted)
-- ============================================================
create table public.center_stage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  center_stage_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.center_stage enable row level security;
create policy "Center stage is public"
  on public.center_stage for select using (true);

-- ============================================================
-- MISS STREAKS (private — your count is yours alone)
-- ============================================================
create table public.miss_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.miss_streaks enable row level security;
create policy "Read your own streak"
  on public.miss_streaks for select using (user_id = auth.uid());

-- ============================================================
-- FINALIZE_EVENTS v3 — the minute hand, now with the rescue.
-- Grid rounds (dance_floor/themed_night/rooftop) end at +2 min:
--   released = a miss (+1) · locked = a match (reset to 0)
-- At 5+ consecutive misses, the spotlight opens for 24h.
-- ============================================================
create or replace function public.finalize_events()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  e record;
  v_threshold int := 5;
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

  -- Who is about to be released (or locked) by this round's close?
  create temp table if not exists _cc_users as
    select distinct ee.user_id
    from public.event_entries ee
    join public.events e on e.id = ee.event_id
    where ee.status = 'reserved'
      and e.status = 'running'
      and e.kind in ('dance_floor', 'themed_night', 'rooftop')
      and now() >= e.starts_at + interval '2 minutes';

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

  -- Center Stage: recompute streaks for this round's participants.
  if exists (select 1 from _cc_users) then
    with grid_ordered as (
      select ee.user_id, ee.status, ev.starts_at,
             row_number() over (partition by ee.user_id order by ev.starts_at desc) as rn
      from public.event_entries ee
      join public.events ev on ev.id = ee.event_id
      where ev.kind in ('dance_floor', 'themed_night', 'rooftop')
        and ee.status in ('released', 'locked', 'canceled')
    ),
    streaks as (
      select g.user_id,
             count(*) filter (
               where g.status = 'released'
                 and g.rn < coalesce(
                   (select min(g2.rn) from grid_ordered g2
                    where g2.user_id = g.user_id and g2.status <> 'released'),
                   2147483647)
             ) as streak
      from grid_ordered g
      join _cc_users u on u.user_id = g.user_id
      group by g.user_id
    )
    update public.miss_streaks ms
    set count = s.streak, updated_at = now()
    from streaks s
    where ms.user_id = s.user_id;

    -- Open (or extend) the spotlight for the newly-rescued.
    with grid_ordered as (
      select ee.user_id, ee.status, ev.starts_at,
             row_number() over (partition by ee.user_id order by ev.starts_at desc) as rn
      from public.event_entries ee
      join public.events ev on ev.id = ee.event_id
      where ev.kind in ('dance_floor', 'themed_night', 'rooftop')
        and ee.status in ('released', 'locked', 'canceled')
    ),
    streaks as (
      select g.user_id,
             count(*) filter (
               where g.status = 'released'
                 and g.rn < coalesce(
                   (select min(g2.rn) from grid_ordered g2
                    where g2.user_id = g.user_id and g2.status <> 'released'),
                   2147483647)
             ) as streak
      from grid_ordered g
      join _cc_users u on u.user_id = g.user_id
      group by g.user_id
    )
    insert into public.center_stage (user_id, center_stage_until)
    select s.user_id, now() + interval '24 hours'
    from streaks s
    where s.streak >= v_threshold
    on conflict (user_id) do update
    set center_stage_until = excluded.center_stage_until;

    -- A match clears the spotlight (they got their win).
    with grid_ordered as (
      select ee.user_id, ee.status, ev.starts_at,
             row_number() over (partition by ee.user_id order by ev.starts_at desc) as rn
      from public.event_entries ee
      join public.events ev on ev.id = ee.event_id
      where ev.kind in ('dance_floor', 'themed_night', 'rooftop')
        and ee.status in ('released', 'locked', 'canceled')
    ),
    streaks as (
      select g.user_id,
             count(*) filter (
               where g.status = 'released'
                 and g.rn < coalesce(
                   (select min(g2.rn) from grid_ordered g2
                    where g2.user_id = g.user_id and g2.status <> 'released'),
                   2147483647)
             ) as streak
      from grid_ordered g
      join _cc_users u on u.user_id = g.user_id
      group by g.user_id
    )
    update public.center_stage cs
    set center_stage_until = null
    from streaks s
    where cs.user_id = s.user_id and s.streak = 0;

    drop table _cc_users;
  end if;

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
