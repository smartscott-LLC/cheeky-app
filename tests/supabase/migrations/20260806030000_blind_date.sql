-- Blind Date (PRD-event-logic §3, 2026-08-06): the Gold floor's host-driven
-- event — one real woman chooser, 3-5 suitors (Gold+). She types her own
-- questions; everyone answers privately; she gives ONE tally per round to the
-- best answer; most tallies over 4 rounds wins the date (a tiebreak final
-- round if needed). Suitors pay for the chance (15); the chooser plays free.
--
-- The minute hand drives the round clock: 1 min to type the question,
-- 1 min to answer, 1 min to select — 4 rounds + a tiebreak final (up to
-- ~15 min, fine for a Gold-floor event). Host failure (never a question, or
-- never a single tally) cancels + refunds everyone — graceful failure.

-- ============================================================
-- HOST SEAT on events (blind_date only)
-- ============================================================
alter table public.events
  add column if not exists host_id uuid references auth.users(id) on delete set null;

-- ============================================================
-- ROUNDS (one row per round; the tally lives here so the room can see
-- who's leading — answers stay private)
-- ============================================================
create table if not exists public.blind_date_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  round_index int not null,               -- 0..3 regular, 4 = tiebreak final
  phase text not null default 'question'
    check (phase in ('question', 'answer', 'selection', 'done')),
  phase_started_at timestamptz not null default now(),
  question text,                           -- the host's question for this round
  skipped boolean not null default false,  -- round with no question/answers
  tally_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, round_index)
);

alter table public.blind_date_rounds enable row level security;
drop policy if exists "Blind date rounds are visible to the room" on public.blind_date_rounds;
create policy "Blind date rounds are visible to the room"
  on public.blind_date_rounds for select using (true);

-- ============================================================
-- ANSWERS (private: the host reads them all, suitors read their own only)
-- ============================================================
create table if not exists public.blind_date_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.blind_date_rounds(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

alter table public.blind_date_answers enable row level security;
drop policy if exists "Blind date answers: host reads all, suitors read their own" on public.blind_date_answers;
create policy "Blind date answers: host reads all, suitors read their own"
  on public.blind_date_answers for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.blind_date_rounds r
      join public.events e on e.id = r.event_id
      where r.id = blind_date_answers.round_id
        and e.host_id = auth.uid()
    )
  );

-- ============================================================
-- CREATE_BLIND_DATE — the chooser launches her room (Gold+)
-- ============================================================
create or replace function public.create_blind_date()
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if public.tier_rank(public.current_tier(v_user)) < 1 then
    raise exception 'floor_required'; -- Gold and up
  end if;
  if exists (
    select 1 from public.events
    where host_id = v_user and kind = 'blind_date' and status in ('open', 'running')
  ) then
    raise exception 'room_active';
  end if;
  -- 10 minutes to fill (min 3 suitors), then the minute hand starts it.
  insert into public.events (kind, floor, starts_at, status, token_cost, min_fill, host_id)
  values ('blind_date', 'gold', now() + interval '10 minutes', 'open', 15, 3, v_user)
  returning id into v_event;
  return v_event;
end;
$$;

grant execute on function public.create_blind_date() to authenticated;

-- ============================================================
-- JOIN_BLIND_DATE — a suitor buys a seat (Gold+, min 3 / cap 5)
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
-- LEAVE_BLIND_DATE — back out while the room is still open
-- ============================================================
create or replace function public.leave_blind_date(p_event_id uuid)
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
    and exists (
      select 1 from public.events e
      where e.id = p_event_id and e.status = 'open'
    );
end;
$$;

grant execute on function public.leave_blind_date(uuid) to authenticated;

-- ============================================================
-- SUBMIT_BLIND_QUESTION — the chooser's question (question phase, 1 min)
-- ============================================================
create or replace function public.submit_blind_question(p_event_id uuid, p_round int, p_question text)
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
  if char_length(p_question) < 1 or char_length(p_question) > 300 then
    raise exception 'invalid_question';
  end if;
  update public.blind_date_rounds r
  set question = p_question
  from public.events e
  where e.id = r.event_id
    and e.id = p_event_id
    and r.round_index = p_round
    and r.phase = 'question'
    and e.host_id = v_user;
  if not found then
    raise exception 'not_host_or_phase';
  end if;
end;
$$;

grant execute on function public.submit_blind_question(uuid, int, text) to authenticated;

-- ============================================================
-- SUBMIT_BLIND_ANSWER — a suitor's answer (answer phase, 1 min)
-- ============================================================
create or replace function public.submit_blind_answer(p_event_id uuid, p_round int, p_body text)
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
  if char_length(p_body) < 1 or char_length(p_body) > 500 then
    raise exception 'invalid_answer';
  end if;
  insert into public.blind_date_answers (round_id, user_id, body)
  select r.id, v_user, p_body
  from public.blind_date_rounds r
  join public.events e on e.id = r.event_id
  where e.id = p_event_id
    and r.round_index = p_round
    and r.phase = 'answer'
    and e.host_id <> v_user
    and exists (
      select 1 from public.event_entries ee
      where ee.event_id = e.id and ee.user_id = v_user and ee.status = 'reserved'
    )
  on conflict (round_id, user_id) do update set body = excluded.body;
  if not found then
    raise exception 'not_suitor_or_phase';
  end if;
end;
$$;

grant execute on function public.submit_blind_answer(uuid, int, text) to authenticated;

-- ============================================================
-- SELECT_BLIND_TALLY — the chooser gives ONE mark (selection phase, 1 min)
-- ============================================================
create or replace function public.select_blind_tally(p_event_id uuid, p_round int, p_selected uuid)
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
  if p_selected = v_user then
    raise exception 'cannot_self';
  end if;
  update public.blind_date_rounds r
  set tally_user_id = p_selected
  from public.events e
  where e.id = r.event_id
    and e.id = p_event_id
    and r.round_index = p_round
    and r.phase = 'selection'
    and e.host_id = v_user
    and exists (
      select 1 from public.event_entries ee
      where ee.event_id = e.id and ee.user_id = p_selected and ee.status = 'reserved'
    );
  if not found then
    raise exception 'not_host_or_phase';
  end if;
end;
$$;

grant execute on function public.select_blind_tally(uuid, int, uuid) to authenticated;

-- ============================================================
-- ADVANCE_BLIND_DATE — the round clock (called by finalize every minute)
--   question (1 min) -> answer (1 min) -> selection (1 min) -> next round
--   4 regular rounds, then a tiebreak final if the top tally is tied.
--   Resolution: suitors pay the 15 (pay for a chance), the chooser plays
--   free, the winner matches the chooser.
-- ============================================================
create or replace function public.advance_blind_date(p_event_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_event record;
  v_round record;
  v_rounds_done int;
  v_top record;
  v_second int;
  v_winner uuid;
  v_pair_a uuid;
  v_pair_b uuid;
  v_match uuid;
begin
  select * into v_event from public.events where id = p_event_id;
  if v_event.kind <> 'blind_date' then
    return;
  end if;

  -- Current (not done) round: run the phase clock.
  select * into v_round
  from public.blind_date_rounds
  where event_id = p_event_id and phase <> 'done'
  order by round_index desc
  limit 1;

  if v_round.id is not null then
    if v_round.phase = 'question' and now() >= v_round.phase_started_at + interval '1 minute' then
      if v_round.question is null then
        update public.blind_date_rounds
        set phase = 'done', skipped = true
        where id = v_round.id;
      else
        update public.blind_date_rounds
        set phase = 'answer', phase_started_at = now()
        where id = v_round.id;
      end if;
    elsif v_round.phase = 'answer' and now() >= v_round.phase_started_at + interval '1 minute' then
      update public.blind_date_rounds
      set phase = 'selection', phase_started_at = now()
      where id = v_round.id;
    elsif v_round.phase = 'selection' and now() >= v_round.phase_started_at + interval '1 minute' then
      update public.blind_date_rounds
      set phase = 'done'
      where id = v_round.id;
    end if;
    return;
  end if;

  -- All rounds done (or none yet): decide the next step.
  select count(*)::int into v_rounds_done
  from public.blind_date_rounds
  where event_id = p_event_id and phase = 'done';

  if v_rounds_done = 0 then
    insert into public.blind_date_rounds (event_id, round_index, phase, phase_started_at)
    values (p_event_id, 0, 'question', now())
    on conflict (event_id, round_index) do nothing;
    return;
  end if;

  -- Host failure: she never asked a single question — cancel + refund all.
  if not exists (
    select 1 from public.blind_date_rounds
    where event_id = p_event_id and question is not null
  ) then
    update public.event_entries
    set status = 'canceled'
    where event_id = p_event_id and status = 'reserved';
    update public.events set status = 'canceled' where id = p_event_id;
    return;
  end if;

  if v_rounds_done < 4 then
    -- More regular rounds to run.
    insert into public.blind_date_rounds (event_id, round_index, phase, phase_started_at)
    values (p_event_id, v_rounds_done, 'question', now())
    on conflict (event_id, round_index) do nothing;
    return;
  end if;

  -- 4+ regular rounds done: the standings decide.
  if not exists (
    select 1 from public.blind_date_rounds
    where event_id = p_event_id and tally_user_id is not null
  ) then
    -- She asked questions but never gave a single mark: graceful failure.
    update public.event_entries
    set status = 'canceled'
    where event_id = p_event_id and status = 'reserved';
    update public.events set status = 'canceled' where id = p_event_id;
    return;
  end if;

  select tally_user_id, count(*)::int as n, min(created_at) as first_at
    into v_top
  from public.blind_date_rounds
  where event_id = p_event_id and tally_user_id is not null
  group by tally_user_id
  order by n desc, first_at asc
  limit 1;

  select count(*)::int into v_second
  from (
    select tally_user_id
    from public.blind_date_rounds
    where event_id = p_event_id and tally_user_id is not null
    group by tally_user_id
    having count(*) = v_top.n and tally_user_id <> v_top.tally_user_id
  ) tied;

  if v_top.n is null then
    return;
  end if;

  if v_rounds_done = 4 and v_second > 0 then
    -- Tied after the 4 regular rounds: the tiebreak final, made a big deal.
    insert into public.blind_date_rounds (event_id, round_index, phase, phase_started_at)
    values (p_event_id, 4, 'question', now())
    on conflict (event_id, round_index) do nothing;
    return;
  end if;

  -- Resolve: the winner is the unique top (or, if the tiebreak still tied,
  -- the earliest first tally — deterministic).
  v_winner := v_top.tally_user_id;

  -- Settlement: suitors pay the ticket (pay for a chance); the chooser free.
  update public.event_entries
  set status = 'locked'
  where event_id = p_event_id and status = 'reserved';

  insert into public.token_ledger (user_id, delta, reason, ref)
  select ee.user_id, -v_event.token_cost, 'blind_date', p_event_id::text
  from public.event_entries ee
  where ee.event_id = p_event_id
    and ee.status = 'locked'
    and ee.user_id <> v_event.host_id
    and not exists (
      select 1 from public.token_ledger tl
      where tl.user_id = ee.user_id
        and tl.reason = 'blind_date'
        and tl.ref = p_event_id::text
    );

  -- The date: winner + chooser.
  if v_winner is not null and v_event.host_id is not null then
    v_pair_a := least(v_event.host_id, v_winner);
    v_pair_b := greatest(v_event.host_id, v_winner);
    insert into public.matches (user_id_a, user_id_b, source, status)
    values (v_pair_a, v_pair_b, 'blind_date', 'active')
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_match;
    if v_match is not null then
      insert into public.conversations (user_id_a, user_id_b)
      values (v_pair_a, v_pair_b)
      on conflict (user_id_a, user_id_b) do nothing;
    end if;
  end if;

  update public.events set status = 'closed' where id = p_event_id;
end;
$$;

-- ============================================================
-- FINALIZE: the minute hand now also drives Blind Date rooms.
-- (create or replace — identical to the fixed version + the blind date loop)
-- ============================================================
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
