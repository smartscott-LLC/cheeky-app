-- Add swipes_today to taskbar_state for swipe daily caps.
-- Caps: silver=15, gold=30, platinum=50, diamond=100.
-- All daily counters reset at midnight CST (America/Chicago), not rolling 24h.

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
  gift_ready_in_minutes int,
  swipes_today bigint
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last_gift timestamptz;
  v_cst_midnight timestamptz;
begin
  if v_user is null then
    return;
  end if;
  -- Calculate midnight CST (America/Chicago timezone)
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
          and r.bucket_start >= v_cst_midnight
      ), 0)
    ))::int as matchmaker_plays_left,
    (
      select count(*) from public.event_entries ee
      join public.events e on e.id = ee.event_id
      where ee.user_id = v_user
        and e.kind = 'blind_date'
        and ee.created_at >= v_cst_midnight
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
    end as gift_ready_in_minutes,
    -- Swipes today: count of likes made since midnight CST
    (
      select count(*)
      from public.likes l
      where l.liker_id = v_user
        and l.created_at >= v_cst_midnight
    ) as swipes_today;
end;
$$;

grant execute on function public.taskbar_state() to authenticated;
