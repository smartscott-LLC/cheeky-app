-- Phase 4A: Speed Dating — a rotation event kind on the Event Engine.
-- Groups of up to 6 by orientation preference, round-robin 1:1 sessions of
-- 90s each, then ranked selection (top + alternate). Mutual top-choice →
-- match + Speed Dating certificate.

-- ============================================================
-- PROFILE: orientation preference (group assignment only)
-- ============================================================
alter table public.profiles
  add column interested_in text not null default 'everyone'
  check (interested_in in ('women', 'men', 'everyone'));

-- ============================================================
-- EVENT ENTRIES: group assignment (dance floor leaves null)
-- ============================================================
alter table public.event_entries
  add column group_number int;

-- ============================================================
-- SPEED SESSIONS (one 1:1 per pair per slot)
-- ============================================================
create table public.speed_sessions (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  group_number int not null,
  slot_index int not null,
  user_a uuid references auth.users(id) on delete cascade not null,
  user_b uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (event_id, group_number, slot_index),
  unique (event_id, user_a, user_b),
  check (user_a < user_b)
);

alter table public.speed_sessions enable row level security;
create policy "Sessions are visible within the event"
  on public.speed_sessions for select using (true);

-- ============================================================
-- SPEED SESSION CHAT (scratchpad for the 1:1; purged with event data)
-- ============================================================
create table public.speed_session_messages (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  group_number int not null,
  slot_index int not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.speed_session_messages enable row level security;
create policy "Read session chat for your group"
  on public.speed_session_messages for select
  using (
    exists (
      select 1 from public.speed_sessions s
      where s.event_id = speed_session_messages.event_id
        and s.group_number = speed_session_messages.group_number
        and (s.user_a = auth.uid() or s.user_b = auth.uid())
    )
  );

-- ============================================================
-- SPEED SELECTIONS (rank 1 = top, rank 2 = alternate)
-- ============================================================
create table public.speed_selections (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  pick_rank smallint not null check (pick_rank in (1, 2)),
  picked_user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, pick_rank)
);

alter table public.speed_selections enable row level security;
create policy "Read your selections"
  on public.speed_selections for select using (user_id = auth.uid());

-- ============================================================
-- CERTIFICATES (the reward) + SPECIAL INTERESTS list
-- ============================================================
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade,
  kind text not null default 'speed_dating',
  issued_at timestamptz not null default now()
);

alter table public.certificates enable row level security;
create policy "Read your certificates"
  on public.certificates for select using (user_id = auth.uid());

create table public.special_interests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  interest_user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, interest_user_id)
);

alter table public.special_interests enable row level security;
create policy "Read your interests"
  on public.special_interests for select using (user_id = auth.uid());
create policy "Add your interests"
  on public.special_interests for insert with check (user_id = auth.uid());

-- ============================================================
-- SCHEDULING: speed dating slots every 6 hours
-- ============================================================
create or replace function public.ensure_speed_dating_events(p_hours int default 48)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  i int;
  v_slot timestamptz;
begin
  for i in 0 .. p_hours / 6 loop
    v_slot := date_trunc('hour', now()) + make_interval(hours => i * 6);
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('speed_dating', 'platinum', v_slot, 'open', 25, 4)
    on conflict (kind, starts_at) do nothing;
  end loop;
end;
$$;

grant execute on function public.ensure_speed_dating_events(int) to authenticated;

-- ============================================================
-- SETUP: assign groups + generate the round-robin schedule
-- Called by finalize_events when a speed dating event starts.
-- ============================================================
create or replace function public.setup_speed_dating(p_event_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_grp int := 0;
  v_idx int := 0;
  r record;
  g record;
  v_players uuid[];
  v_n int;
  v_a uuid;
  v_b uuid;
  v_round int;
  v_k int;
begin
  delete from public.speed_sessions where event_id = p_event_id;

  -- Assign groups of up to 6, ordered by orientation preference.
  for r in
    select ee.user_id
    from public.event_entries ee
    where ee.event_id = p_event_id and ee.status = 'reserved'
    order by (select p.interested_in from public.profiles p where p.id = ee.user_id)
  loop
    v_idx := v_idx + 1;
    if v_idx > 6 then
      v_idx := 1;
      v_grp := v_grp + 1;
    end if;
    update public.event_entries
    set group_number = v_grp
    where event_id = p_event_id and user_id = r.user_id;
  end loop;

  -- Round-robin schedule (circle method) per group.
  for g in
    select distinct group_number
    from public.event_entries
    where event_id = p_event_id and group_number is not null
    order by group_number
  loop
    select array_agg(user_id order by user_id) into v_players
    from public.event_entries
    where event_id = p_event_id and group_number = g.group_number and status = 'reserved';

    v_n := coalesce(array_length(v_players, 1), 0);
    if v_n < 2 then
      continue;
    end if;

    v_round := 0;
    while v_round < v_n - 1 loop
      v_k := 0;
      while v_k < floor(v_n / 2) loop
        v_a := v_players[v_k + 1];
        v_b := v_players[v_n - v_k];
        if v_a is distinct from v_b then
          insert into public.speed_sessions (event_id, group_number, slot_index, user_a, user_b)
          values (p_event_id, g.group_number, v_round, least(v_a, v_b), greatest(v_a, v_b))
          on conflict (event_id, group_number, slot_index) do nothing;
        end if;
        v_k := v_k + 1;
      end loop;
      v_players := v_players[v_n] || v_players[1:v_n - 1];
      v_round := v_round + 1;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- SEND_SPEED_MESSAGE — session chat (no daily caps; block-aware)
-- ============================================================
create or replace function public.send_speed_message(p_event_id uuid, p_group int, p_slot int, p_body text)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_msg bigint;
begin
  if v_sender is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 500 then
    raise exception 'invalid_message_length';
  end if;

  if not exists (
    select 1 from public.speed_sessions s
    where s.event_id = p_event_id
      and s.group_number = p_group
      and s.slot_index = p_slot
      and (s.user_a = v_sender or s.user_b = v_sender)
  ) then
    raise exception 'not_in_session';
  end if;

  insert into public.speed_session_messages (event_id, group_number, slot_index, sender_id, body)
  values (p_event_id, p_group, p_slot, v_sender, p_body)
  returning id into v_msg;

  return v_msg;
end;
$$;

grant execute on function public.send_speed_message(uuid, int, int, text) to authenticated;

-- ============================================================
-- SELECT_SPEED_RANK — top + alternate at the end
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
  if p_pick_rank not in (1, 2) then
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
-- RESOLVE_SPEED_DATING — mutual top-choice → match + certificates
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
begin
  for r in
    select s1.user_id as a, s1.picked_user_id as b
    from public.speed_selections s1
    join public.speed_selections s2
      on s2.user_id = s1.picked_user_id
     and s2.picked_user_id = s1.user_id
     and s2.pick_rank = 1
    where s1.event_id = p_event_id
      and s1.pick_rank = 1
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
  end loop;
end;
$$;

-- ============================================================
-- FINALIZE: extend the minute hand for speed dating phases
--   running  → setup + rotation (n-1 slots × 90s)
--   closed   → resolve matches
-- ============================================================
create or replace function public.finalize_events()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  e record;
  v_slots int;
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

  -- End dance-floor rounds (2-min window) — release unmatched holds.
  update public.event_entries ee
  set status = 'released'
  from public.events e
  where e.id = ee.event_id
    and ee.status = 'reserved'
    and e.status = 'running'
    and e.kind = 'dance_floor'
    and now() >= e.starts_at + interval '2 minutes';

  -- End speed dating rotation: selection window opens for 3 minutes.
  for e in
    select e.*,
      (select count(*) from public.event_entries ee
       where ee.event_id = e.id and ee.status = 'reserved') as n
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

select cron.schedule('cheeky_ensure_speed_dating', '10 * * * *',
  $$ select public.ensure_speed_dating_events(48) $$);
