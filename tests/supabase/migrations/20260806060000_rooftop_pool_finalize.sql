-- The Rooftop pool owns its own clock now (cheeky_rooftop_tick, 10s). The
-- minute hand must NOT treat rooftop as a grid room anymore — the 2-minute
-- release/close would kill the pool mid-bracket. Rooftop is removed from
-- every grid-kind list (release, close, center-stage streaks).

create or replace function public.finalize_events()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_event record;
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
  for v_event in
    select e.*,
      (select count(*) from public.event_entries ee
       where ee.event_id = e.id and ee.status = 'reserved') as fill
    from public.events e
    where e.status = 'open' and now() >= e.starts_at
  loop
    if v_event.fill >= v_event.min_fill then
      update public.events set status = 'running' where id = v_event.id;
      if v_event.kind = 'speed_dating' then
        perform public.setup_speed_dating(v_event.id);
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
      and e.kind in ('dance_floor', 'themed_night')
      and now() >= e.starts_at + interval '2 minutes';

  -- End grid rounds (2-min window): release unmatched holds, close the room.
  update public.event_entries ee
  set status = 'released'
  from public.events e
  where e.id = ee.event_id
    and ee.status = 'reserved'
    and e.status = 'running'
    and e.kind in ('dance_floor', 'themed_night')
    and now() >= e.starts_at + interval '2 minutes';

  update public.events e
  set status = 'closed'
  where e.status = 'running'
    and e.kind in ('dance_floor', 'themed_night')
    and now() >= e.starts_at + interval '2 minutes';

  -- Center Stage: recompute streaks for this round's participants.
  if exists (select 1 from _cc_users) then
    with grid_ordered as (
      select ee.user_id, ee.status, ev.starts_at,
             row_number() over (partition by ee.user_id order by ev.starts_at desc) as rn
      from public.event_entries ee
      join public.events ev on ev.id = ee.event_id
      where ev.kind in ('dance_floor', 'themed_night')
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
      where ev.kind in ('dance_floor', 'themed_night')
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
      where ev.kind in ('dance_floor', 'themed_night')
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
  for v_event in
    select e.*
    from public.events e
    where e.status = 'running' and e.kind = 'speed_dating'
      and now() >= e.starts_at + (select coalesce(max(slot_index), 0) + 1 from public.speed_sessions where event_id = e.id) * interval '90 seconds'
  loop
    update public.events set status = 'closed' where id = v_event.id;
  end loop;

  -- Resolve speed dating after the selection window.
  for v_event in
    select id from public.events
    where status = 'closed' and kind = 'speed_dating'
      and now() >= starts_at + interval '12 minutes'
  loop
    perform public.resolve_speed_dating(v_event.id);
    update public.events set status = 'canceled' where id = v_event.id and kind = 'speed_dating';
  end loop;

  -- Blind Date: the round clock (1 min per phase; resolution + settlement
  -- live inside advance_blind_date).
  for v_event in
    select id from public.events
    where status = 'running' and kind = 'blind_date'
  loop
    perform public.advance_blind_date(v_event.id);
  end loop;
end;
$$;
