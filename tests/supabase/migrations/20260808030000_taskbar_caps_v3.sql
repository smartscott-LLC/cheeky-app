-- Tiki Taskbar v3 (2026-08-08, founder): the bar carries every hard-capped,
-- non-hourly allowance. This adds:
--   1. Blind Date daily join cap (2/day — founder approved "in"; tunable).
--      Non-hourly events must be rate-limited; Blind Date is host-driven but
--      a member with tokens could otherwise hop rooms all day.
--   2. taskbar_state grows: blind_date_joins_today + the gift cooldown state
--      (1 send/hour — the tile shows minutes-to-ready when cooling).

-- ============================================================
-- JOIN_BLIND_DATE — daily cap (2/day), after the existing room checks
-- ============================================================
create or replace function public.join_blind_date(p_event_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event record;
  v_balance int;
  v_holds int;
  v_count int;
  v_today int;
  v_entry uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if public.tier_rank(public.current_tier(v_user)) < 1 then
    raise exception 'floor_required'; -- Gold and up
  end if;

  -- Serialize this member's joins (same guard as join_event).
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select * into v_event from public.events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event_not_found';
  end if;
  if v_event.kind <> 'blind_date' then
    raise exception 'wrong_kind';
  end if;
  if v_event.status <> 'open' then
    raise exception 'event_not_open';
  end if;
  if v_event.host_id = v_user then
    raise exception 'cannot_join_own_room';
  end if;
  if exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = v_user
  ) then
    raise exception 'already_joined';
  end if;
  select count(*) into v_count
  from public.event_entries
  where event_id = p_event_id and status = 'reserved';
  if v_count >= 5 then
    raise exception 'room_full';
  end if;

  -- Daily cap: two Blind Dates a day, max (the bar's tile shows what's left).
  select count(*) into v_today
  from public.event_entries ee
  join public.events e on e.id = ee.event_id
  where ee.user_id = v_user
    and e.kind = 'blind_date'
    and ee.created_at >= date_trunc('day', now());
  if v_today >= 2 then
    raise exception 'blind_date_daily_limit';
  end if;

  -- Available = ledger balance - active holds.
  select coalesce(sum(delta), 0) into v_balance
  from public.token_ledger
  where user_id = v_user;
  select coalesce(sum(e.token_cost), 0) into v_holds
  from public.event_entries ee
  join public.events e on e.id = ee.event_id
  where ee.user_id = v_user and ee.status = 'reserved';
  if v_balance - v_holds < v_event.token_cost then
    raise exception 'insufficient_tokens';
  end if;

  insert into public.event_entries (event_id, user_id, status)
  values (p_event_id, v_user, 'reserved')
  returning id into v_entry;
  return v_entry;
end;
$$;

grant execute on function public.join_blind_date(uuid) to authenticated;

-- ============================================================
-- TASKBAR STATE — v3 (drop + recreate: return type changed)
-- ============================================================
drop function if exists public.taskbar_state();

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
    -- Matchmaker isn't built yet; the 2/3/4/5 plays dial lands with it.
    null::int as matchmaker_plays_left,
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
