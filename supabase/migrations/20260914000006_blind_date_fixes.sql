-- FIX: Blind Date — free joins, 60s warmup, gender-preference exception.
--
-- Changes:
-- 1. join_blind_date: remove token cost (free for all Gold+ tiers).
-- 2. create_blind_date: 60s warmup instead of 10 min.
-- 3. Gender exception: allow host if profile gender matches partner's gender preference
--    (e.g., male user who prefers males can host vs female suitors).
--
-- NOTE: The host-gender rule (female-only) remains enforced at the UI level.
-- The exception applies only when a user's gender preference aligns with the opposite-gender rule,
-- allowing same-preference pairings.

-- 1. Update create_blind_date: 60s warmup instead of 10 min.
create or replace function public.create_blind_date()
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event uuid;
  v_gender text;
  v_pref text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if public.tier_rank(public.current_tier(v_user)) < 1 then
    raise exception 'floor_required'; -- Gold and up
  end if;

  -- Host must be female, UNLESS the user's gender preference creates an exception:
  -- a male who prefers males can host vs female suitors (gender = preference match).
  select gender, coalesce(interested_in, 'everyone') into v_gender, v_pref
  from public.profiles where id = v_user;

  -- Exception logic: if gender matches preference direction, allow hosting.
  -- Default rule: only females can host.
  -- Exception: male users whose preference is 'male' can host (they'd be hosting female suitors
  -- in a reversed dynamic, but per the founder's intent this is the only allowed exception).
  -- For 'female' preference: female users already can host.
  -- For 'everyone'/'both': fall back to default (female only).
  if v_gender = 'male' and v_pref = 'male' then
    -- Exception case: male hosting female suitors — allowed.
    null;
  elsif v_gender != 'female' then
    raise exception 'host_gender_required';
  end if;

  if exists (
    select 1 from public.events
    where host_id = v_user and kind = 'blind_date' and status in ('open', 'running')
  ) then
    raise exception 'room_active';
  end if;

  -- 60-second warmup (was 10 minutes).
  insert into public.events (kind, floor, starts_at, status, token_cost, min_fill, host_id)
  values ('blind_date', 'gold', now() + interval '60 seconds', 'open', 0, 3, v_user)
  returning id into v_event;

  return v_event;
end;
$$;

grant execute on function public.create_blind_date() to authenticated;

-- 2. Update join_blind_date: free (token_cost = 0), no balance check.
create or replace function public.join_blind_date(p_event_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event record;
  v_count int;
  v_entry uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if public.tier_rank(public.current_tier(v_user)) < 1 then
    raise exception 'floor_required'; -- Gold and up
  end if;

  -- Serialize joins.
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select * into v_event from public.events where id = p_event_id;
  if v_event.id is null then
    raise exception 'event_not_found';
  end if;
  if v_event.kind <> 'blind_date' then
    raise exception 'wrong_event_kind';
  end if;
  if v_event.status != 'open' then
    raise exception 'event_not_open';
  end if;

  -- Count current suitors (excluding the host).
  select count(*) into v_count
  from public.event_entries
  where event_id = p_event_id and user_id != v_event.host_id;

  if v_count >= 5 then
    raise exception 'room_full'; -- max 5 suitors
  end if;

  -- Free entry — no balance check needed.
  insert into public.event_entries (event_id, user_id, status)
  values (p_event_id, v_user, 'joined')
  returning id into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.join_blind_date(uuid) to authenticated;
