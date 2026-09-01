-- Tiki Taskbar foundation (PRD: docs/PRD-tiki-taskbar.md, 2026-08-08):
--   1. messages.read_at — the unread flag (null = unread to the recipient),
--      set by mark_conversation_read when a member opens a thread.
--   2. current_streak() — read-only Coat Check streak (record_checkin
--      writes + awards badges; the bar must never record on a read).
--   3. taskbar_state() — one RPC returning every count the bar needs,
--      scoped to the caller: tier, unread, sparks, streak, tokens, next-set
--      minutes per event kind, and the Blind Date open state + room size.

-- ============================================================
-- MESSAGES read state
-- ============================================================
alter table public.messages
  add column if not exists read_at timestamptz;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
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
  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_user
    and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ============================================================
-- CURRENT STREAK — read-only (mirrors record_checkin's count,
-- no insert, no badge awards; a streak survives until midnight)
-- ============================================================
create or replace function public.current_streak()
returns int
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_streak int := 0;
  v_day date := current_date;
begin
  if v_user is null then
    return 0;
  end if;
  -- Checked in today? Count from today. Otherwise the run is still alive
  -- until midnight — count from yesterday.
  if not exists (
    select 1 from public.daily_checkins
    where user_id = v_user and day = v_day
  ) then
    v_day := v_day - 1;
  end if;
  while exists (
    select 1 from public.daily_checkins
    where user_id = v_user and day = v_day
  ) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;
  return v_streak;
end;
$$;

grant execute on function public.current_streak() to authenticated;

-- ============================================================
-- NEXT EVENT MINUTES — minutes until a kind's next (or live) slot
-- ============================================================
create or replace function public.next_event_minutes(p_kind text)
returns int
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_starts timestamptz;
begin
  select e.starts_at into v_starts
  from public.events e
  where e.kind = p_kind
    and e.status in ('open', 'locked')
    and e.starts_at >= now() - interval '3 minutes'
  order by e.starts_at
  limit 1;
  if v_starts is null then
    return null;
  end if;
  return greatest(0, ceil(extract(epoch from (v_starts - now())) / 60)::int);
end;
$$;

grant execute on function public.next_event_minutes(text) to authenticated;

-- ============================================================
-- TASKBAR STATE — every count the bar needs, one round trip
-- ============================================================
create or replace function public.taskbar_state()
returns table (
  tier text,
  unread bigint,
  sparks bigint,
  streak int,
  tokens bigint,
  dance_minutes int,
  speed_minutes int,
  rooftop_minutes int,
  blind_open boolean,
  blind_in bigint
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;
  return query
  select
    public.current_tier(v_user) as tier,
    (
      select count(*) from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id <> v_user
        and m.read_at is null
        and (c.user_id_a = v_user or c.user_id_b = v_user)
    ) as unread,
    (
      -- Likes I received with no like back and no active match, plus waves
      -- I received with no wave back — the unanswered sparks queue.
      (
        select count(*) from public.likes l
        where l.likee_id = v_user
          and not exists (
            select 1 from public.likes mine
            where mine.liker_id = v_user and mine.likee_id = l.liker_id
          )
          and not exists (
            select 1 from public.matches m
            where m.user_id_a = least(v_user, l.liker_id)
              and m.user_id_b = greatest(v_user, l.liker_id)
              and m.status = 'active'
          )
      ) + (
        select count(*) from public.waves w
        where w.recipient_id = v_user
          and not exists (
            select 1 from public.waves mine
            where mine.sender_id = v_user and mine.recipient_id = w.sender_id
          )
      )
    ) as sparks,
    public.current_streak() as streak,
    (
      select coalesce(sum(delta), 0) from public.token_ledger
      where user_id = v_user
    ) as tokens,
    public.next_event_minutes('dance_floor') as dance_minutes,
    public.next_event_minutes('speed_dating') as speed_minutes,
    public.next_event_minutes('rooftop') as rooftop_minutes,
    exists (
      select 1 from public.events e
      where e.kind = 'blind_date' and e.status = 'open'
    ) as blind_open,
    (
      select count(*) from public.event_entries en
      where en.event_id in (
        select e.id from public.events e
        where e.kind = 'blind_date' and e.status = 'open'
      )
    ) as blind_in;
end;
$$;

grant execute on function public.taskbar_state() to authenticated;
