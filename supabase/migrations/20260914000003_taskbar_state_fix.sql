-- FIX: taskbar_state — update matchmaker and add l3 counter.
-- Matchmaker: 3/5/8/12 (was 2/3/4/5).
-- L3 trios: add l3_trios_used_today counter (4/8/12/20).
-- Gift cooldown: change from 1-hour window to 15-minute window.

drop function if exists public.taskbar_state();

create or replace function public.taskbar_state()
returns table (
  tier text,
  messages_sent_today bigint,
  new_people_today bigint,
  checked_in_today boolean,
  matchmaker_plays_left int,
  l3_trios_used_today bigint,
  blind_date_joins_today bigint,
  gift_ready boolean,
  gift_ready_in_minutes int,
  swipes_today bigint,
  icebreakers_used_today bigint
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cst_midnight timestamptz;
begin
  if v_user is null then
    return;
  end if;
  v_cst_midnight := (now() AT TIME ZONE 'America/Chicago')::date::timestamptz AT TIME ZONE 'UTC';
  return query
  select
    public.current_tier(v_user) as tier,
    (
      select count(*) from public.messages m
      where m.sender_id = v_user
        and m.created_at >= v_cst_midnight
    ) as messages_sent_today,
    (
      select count(distinct
          case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id = v_user
        and m.created_at >= v_cst_midnight
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
    -- Matchmaker plays LEFT today: 3/5/8/12 dial.
    greatest(0, (
      case public.current_tier(v_user)
        when 'gold' then 5
        when 'platinum' then 8
        when 'diamond' then 12
        else 3
      end
      - coalesce((
        select r.calls
        from public.rate_limits r
        where r.key = 'matchmaker:plays:' || v_user
          and r.bucket_start >= v_cst_midnight
      ), 0)
    ))::int as matchmaker_plays_left,
    -- L³ trios used today: 4/8/12/20 dial.
    coalesce((
      select r.calls
      from public.rate_limits r
      where r.key = 'l3:trios:' || v_user
        and r.bucket_start >= v_cst_midnight
    ), 0) as l3_trios_used_today,
    (
      select count(*) from public.event_entries ee
      join public.events e on e.id = ee.event_id
      where ee.user_id = v_user
        and e.kind = 'blind_date'
        and ee.created_at >= v_cst_midnight
    ) as blind_date_joins_today,
    -- Gift ready: 1 per 15 minutes (900s window).
    not exists (
      select 1 from public.gift_sends
      where sender_id = v_user and sent_at > now() - interval '15 minutes'
    ) as gift_ready,
    case
      when exists (
        select 1 from public.gift_sends
        where sender_id = v_user and sent_at > now() - interval '15 minutes'
      ) then greatest(1, ceil(extract(epoch from ((
          select max(gs.sent_at) from public.gift_sends gs
          where gs.sender_id = v_user and gs.sent_at > now() - interval '15 minutes'
        ) + interval '15 minutes' - now())) / 60)::int)
      else 0
    end as gift_ready_in_minutes,
    -- Swipes today.
    (
      select count(*)
      from public.likes l
      where l.liker_id = v_user
        and l.created_at >= v_cst_midnight
    ) as swipes_today,
    -- Icebreakers used today.
    coalesce((
      select i.used
      from public.icebreaker_usage i
      where i.user_id = v_user
        and i.day = current_date
    ), 0) as icebreakers_used_today
  ;
end;
$$;

grant execute on function public.taskbar_state() to authenticated;
