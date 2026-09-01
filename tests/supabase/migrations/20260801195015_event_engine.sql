-- Event Engine (Phase 2) — the Dance Floor, reference event.
-- Hourly events; entry RESERVES tokens (hold, not debit); first mutual
-- click = instant match; song chat is a conversation exempt from daily
-- messaging caps. All writes via security-definer RPCs.

-- ============================================================
-- EVENTS (the schedule)
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'dance_floor',
  floor text not null default 'silver',
  starts_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'running', 'closed', 'canceled')),
  token_cost int not null default 3,
  min_fill int not null default 20,
  created_at timestamptz not null default now(),
  unique (kind, starts_at)
);

alter table public.events enable row level security;
create policy "Events are public"
  on public.events for select using (true);

-- ============================================================
-- EVENT ENTRIES (reservations + floor state)
-- status: reserved (hold active) | locked (matched, hold spent)
--         | released (no match / left) | canceled (event canceled)
-- ============================================================
create table public.event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'locked', 'released', 'canceled')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_entries enable row level security;
-- The grid is the product: participants are visible within the event.
create policy "Event entries are public"
  on public.event_entries for select using (true);

-- ============================================================
-- EVENT PICKS (the 2-minute selection round)
-- ============================================================
create table public.event_picks (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  picker_id uuid references auth.users(id) on delete cascade not null,
  pickee_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (event_id, picker_id, pickee_id)
);

alter table public.event_picks enable row level security;
-- Picks are private: only your own selections are readable.
create policy "Read your own picks"
  on public.event_picks for select
  using (picker_id = auth.uid());

-- ============================================================
-- ENSURE_EVENTS — create the next N hourly slots if missing
-- ============================================================
create or replace function public.ensure_events(p_hours int default 2)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_anchor timestamptz := date_trunc('hour', now());
  i int;
begin
  for i in 0 .. p_hours - 1 loop
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('dance_floor', 'silver', v_anchor + make_interval(hours => i), 'open', 3, 20)
    on conflict (kind, starts_at) do nothing;
  end loop;
end;
$$;

grant execute on function public.ensure_events(int) to authenticated;

-- ============================================================
-- JOIN_EVENT — pre-check balance, then RESERVE the hold
-- ============================================================
create or replace function public.join_event(p_event_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_balance int;
  v_holds int;
  v_entry uuid;
  v_event_status text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select status, token_cost into v_event_status, v_cost
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
-- LEAVE_EVENT — release the hold before the round starts
-- ============================================================
create or replace function public.leave_event(p_event_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.event_entries
  set status = 'released'
  where event_id = p_event_id
    and user_id = auth.uid()
    and status = 'reserved'
    and exists (select 1 from public.events e where e.id = p_event_id and e.status = 'open');
end;
$$;

grant execute on function public.leave_event(uuid) to authenticated;

-- ============================================================
-- PICK_ON_FLOOR — 10-pick budget; first mutual click = instant match
-- ============================================================
create or replace function public.pick_on_floor(p_event_id uuid, p_pickee uuid)
returns table (matched boolean, match_id uuid)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event_status text;
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

  select status into v_event_status
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
    values (v_pair_a, v_pair_b, 'dance_floor', 'active')
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_match;

    -- Song chat conversation (reuses existing if they already talk).
    perform public.get_or_create_conversation(p_pickee);

    -- Convert both holds to spend.
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (v_user, -3, 'dance_floor', v_match),
           (p_pickee, -3, 'dance_floor', v_match);

    update public.event_entries
    set status = 'locked'
    where event_id = p_event_id and user_id in (v_user, p_pickee);
  end if;

  return query select v_match is not null, v_match;
end;
$$;

grant execute on function public.pick_on_floor(uuid, uuid) to authenticated;

-- ============================================================
-- SEND_EVENT_MESSAGE — song chat: no daily caps (paid by tokens)
-- Still block-aware and participant-only.
-- ============================================================
create or replace function public.send_event_message(p_conversation_id uuid, p_body text)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_other uuid;
  v_msg bigint;
begin
  if v_sender is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then
    raise exception 'invalid_message_length';
  end if;

  select case when user_id_a = v_sender then user_id_b else user_id_a end
    into v_other
  from public.conversations
  where id = p_conversation_id;
  if v_other is null then
    raise exception 'not_a_participant';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_sender and blocked_id = v_other)
       or (blocker_id = v_other and blocked_id = v_sender)
  ) then
    raise exception 'blocked';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_sender, p_body)
  returning id into v_msg;

  return v_msg;
end;
$$;

grant execute on function public.send_event_message(uuid, text) to authenticated;

-- ============================================================
-- FINALIZE_EVENTS — the minute hand of the club (pg_cron, every minute)
--   cancel low-fill events (release holds)
--   start events that reached min fill
--   end the round (release unmatched holds)
-- ============================================================
create or replace function public.finalize_events()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- Cancel low-fill events that should have started.
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

  -- Start events that met min fill.
  update public.events e
  set status = 'running'
  where e.status = 'open'
    and now() >= e.starts_at
    and (select count(*) from public.event_entries ee
         where ee.event_id = e.id and ee.status = 'reserved') >= e.min_fill;

  -- End the round: release unmatched holds.
  update public.event_entries ee
  set status = 'released'
  from public.events e
  where e.id = ee.event_id
    and ee.status = 'reserved'
    and e.status = 'running'
    and now() >= e.starts_at + interval '2 minutes';

  update public.events e
  set status = 'closed'
  where e.status = 'running'
    and now() >= e.starts_at + interval '2 minutes';
end;
$$;

select cron.schedule('cheeky_finalize_events', '* * * * *',
  $$ select public.finalize_events() $$);

select cron.schedule('cheeky_ensure_events', '5 * * * *',
  $$ select public.ensure_events(2) $$);
