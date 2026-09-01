-- Speed Dating rework (PRD-event-logic §4, 2026-08-06):
--   1. Full ranking: rank EVERYONE you met (1 = most wanted .. 5 = least),
--      not just top + one alternate.
--   2. Settlement ("pay for the opportunity"): after the selection window,
--      EVERY participant pays the ticket (no refunds — a member may exit
--      without dating anyone, the charge stands; canceled events still
--      refund). Holds convert to spend, entries lock out of the rotation.
--   3. Matching: strongest mutual preferences match first (lowest rank-sum),
--      greedy — as soon as you hit a match with somebody, there you go.
-- The old code never settled anything: matched pairs were never debited and
-- every entry stayed 'reserved' forever (tokens held indefinitely).

-- ============================================================
-- SELECT_SPEED_RANK — full 1..5 ranking
-- ============================================================
create or replace function public.select_speed_rank(p_event_id uuid, p_pick_rank smallint, p_picked uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_pick_rank < 1 or p_pick_rank > 5 then
    raise exception 'invalid_rank';
  end if;
  if p_picked = v_user then
    raise exception 'cannot_pick_self';
  end if;

  -- Must be a participant in the event.
  if not exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = v_user and status = 'reserved'
  ) then
    raise exception 'not_in_event';
  end if;

  -- Can only pick someone from your group.
  if not exists (
    select 1 from public.event_entries ee1
    join public.event_entries ee2 on ee2.group_number = ee1.group_number
    where ee1.event_id = p_event_id and ee1.user_id = v_user
      and ee2.event_id = p_event_id and ee2.user_id = p_picked
  ) then
    raise exception 'not_in_your_group';
  end if;

  insert into public.speed_selections (event_id, user_id, pick_rank, picked_user_id)
  values (p_event_id, v_user, p_pick_rank, p_picked)
  on conflict (event_id, user_id, pick_rank) do update
    set picked_user_id = excluded.picked_user_id;
end;
$$;

grant execute on function public.select_speed_rank(uuid, smallint, uuid) to authenticated;

-- ============================================================
-- RESOLVE_SPEED_DATING — greedy mutual matching + full settlement
-- Called by finalize_events after the selection window.
-- ============================================================
create or replace function public.resolve_speed_dating(p_event_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
  v_match uuid;
  v_pair_a uuid;
  v_pair_b uuid;
  v_done boolean;
begin
  -- Greedy mutual matching: repeatedly take the strongest mutual pair
  -- (lowest rank-sum, then lowest single rank) among unmatched members.
  drop table if exists _sd_matched;
  create temp table _sd_matched (user_id uuid primary key);

  loop
    v_done := false;
    for r in
      select s1.user_id as a, s2.user_id as b
      from public.speed_selections s1
      join public.speed_selections s2
        on s2.event_id = s1.event_id
       and s2.user_id = s1.picked_user_id
       and s2.picked_user_id = s1.user_id
      where s1.event_id = p_event_id
        and not exists (
          select 1 from _sd_matched m
          where m.user_id in (s1.user_id, s1.picked_user_id)
        )
      order by (s1.pick_rank + s2.pick_rank), least(s1.pick_rank, s2.pick_rank)
      limit 1
    loop
      v_pair_a := least(r.a, r.b);
      v_pair_b := greatest(r.a, r.b);

      insert into public.matches (user_id_a, user_id_b, source, status)
      values (v_pair_a, v_pair_b, 'speed_dating', 'active')
      on conflict (user_id_a, user_id_b) do nothing
      returning id into v_match;

      if v_match is not null then
        insert into public.certificates (user_id, match_id, kind)
        values (r.a, v_match, 'speed_dating'), (r.b, v_match, 'speed_dating');

        -- Real conversation (inline — no auth.uid() in the cron context).
        insert into public.conversations (user_id_a, user_id_b)
        values (v_pair_a, v_pair_b)
        on conflict (user_id_a, user_id_b) do nothing;
      end if;

      insert into _sd_matched (user_id) values (r.a), (r.b)
      on conflict (user_id) do nothing;
      v_done := true;
      exit;
    end loop;
    if not v_done then
      exit;
    end if;
  end loop;

  drop table if exists _sd_matched;

  -- Settle the money: everyone pays the ticket — pay for the opportunity,
  -- no refunds. Holds convert to spend; entries lock out of the rotation.
  -- Idempotent: entries already locked (or a prior debit) are skipped.
  update public.event_entries ee
  set status = 'locked'
  where ee.event_id = p_event_id
    and ee.status = 'reserved';

  insert into public.token_ledger (user_id, delta, reason, ref)
  select ee.user_id, -e.token_cost, 'speed_dating', e.id::text
  from public.event_entries ee
  join public.events e on e.id = ee.event_id
  where ee.event_id = p_event_id
    and ee.status = 'locked'
    and not exists (
      select 1 from public.token_ledger tl
      where tl.user_id = ee.user_id
        and tl.reason = 'speed_dating'
        and tl.ref = e.id::text
    );
end;
$$;

grant execute on function public.resolve_speed_dating(uuid) to authenticated;
