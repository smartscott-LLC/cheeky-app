-- Phase 3: entitlements — tier resolution (subscription | complimentary
-- grant | guest pass). One current_tier() to rule them all.

-- ============================================================
-- COMPLIMENTARY GRANTS (giveaways, influencer invites, support)
-- Writes are service-role only (no client policies).
-- ============================================================
create table public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tier text not null check (tier in ('gold', 'platinum', 'diamond')),
  reason text not null default 'giveaway',
  granted_by uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.entitlement_grants enable row level security;
create policy "Read your own grants"
  on public.entitlement_grants for select
  using (user_id = auth.uid());

-- ============================================================
-- GUEST PASSES (a member brings a Guest up for 24h)
-- ============================================================
create table public.guest_passes (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users(id) on delete cascade not null,
  guest_id uuid references auth.users(id) on delete cascade not null,
  tier text not null check (tier in ('gold', 'platinum', 'diamond')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.guest_passes enable row level security;
create policy "Host reads passes they sent"
  on public.guest_passes for select
  using (host_id = auth.uid());
create policy "Guest reads passes they hold"
  on public.guest_passes for select
  using (guest_id = auth.uid());

-- ============================================================
-- TIER RESOLUTION
-- ============================================================
create or replace function public.tier_rank(p_tier text)
returns int
language sql immutable
as $$
  select case p_tier
    when 'diamond' then 3
    when 'platinum' then 2
    when 'gold' then 1
    else 0
  end;
$$;

create or replace function public.current_tier(p_user uuid)
returns text
language plpgsql stable
as $$
declare
  v_tier text;
begin
  -- Guest pass first (most recent, unexpired).
  select tier into v_tier
  from public.guest_passes
  where guest_id = p_user and expires_at > now()
  order by created_at desc
  limit 1;
  if v_tier is not null then
    return v_tier;
  end if;

  -- Complimentary grant.
  select tier into v_tier
  from public.entitlement_grants
  where user_id = p_user and expires_at > now()
  order by created_at desc
  limit 1;
  if v_tier is not null then
    return v_tier;
  end if;

  -- Paid subscription.
  select coalesce(p.name, 'Standard Membership') into v_tier
  from public.subscriptions s
  join public.prices pr on pr.id = s.price_id
  join public.products p on p.id = pr.product_id
  where s.user_id = p_user
    and s.status in ('active', 'trialing')
  order by s.created_at desc
  limit 1;

  return case v_tier
    when 'Gold Membership' then 'gold'
    when 'Platinum Membership' then 'platinum'
    when 'Diamond Club' then 'diamond'
    else 'standard'
  end;
end;
$$;

grant execute on function public.current_tier(uuid) to authenticated;

-- ============================================================
-- SEND_GUEST_PASS — a paid member brings a Guest up 24h
-- ============================================================
create or replace function public.send_guest_pass(p_guest uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_host uuid := auth.uid();
  v_tier text;
  v_pass uuid;
begin
  if v_host is null then
    raise exception 'not_authenticated';
  end if;
  if v_host = p_guest then
    raise exception 'cannot_pass_self';
  end if;

  v_tier := public.current_tier(v_host);
  if v_tier = 'standard' then
    raise exception 'pass_requires_membership';
  end if;

  insert into public.guest_passes (host_id, guest_id, tier, expires_at)
  values (v_host, p_guest, v_tier, now() + interval '24 hours')
  returning id into v_pass;

  return v_pass;
end;
$$;

grant execute on function public.send_guest_pass(uuid) to authenticated;

-- ============================================================
-- MESSAGING uses current_tier (unified limits)
-- ============================================================
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_other uuid;
  v_tier text;
  v_msg_limit int;
  v_people_limit int;
  v_msg_today int;
  v_people_today int;
  v_matched boolean;
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

  if exists (
    select 1 from public.matches m
    where m.user_id_a = least(v_sender, v_other)
      and m.user_id_b = greatest(v_sender, v_other)
      and m.status = 'declined'
  ) then
    raise exception 'conversation_closed';
  end if;

  v_tier := public.current_tier(v_sender);
  v_msg_limit := case v_tier when 'gold' then 75 else 30 end;
  v_people_limit := case v_tier
    when 'gold' then 15
    when 'platinum' then 40
    when 'diamond' then 100
    else 5
  end;

  select count(*) into v_msg_today
  from public.messages m
  where m.sender_id = v_sender
    and m.created_at >= date_trunc('day', now());

  if v_msg_today >= v_msg_limit then
    raise exception 'daily_message_limit';
  end if;

  select exists (
    select 1 from public.matches
    where user_id_a = least(v_sender, v_other)
      and user_id_b = greatest(v_sender, v_other)
      and status = 'active'
  ) into v_matched;

  if not v_matched then
    select count(distinct
        case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
      into v_people_today
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.sender_id = v_sender
      and m.created_at >= date_trunc('day', now())
      and not exists (
        select 1 from public.matches mt
        where mt.user_id_a =
                least(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
          and mt.user_id_b =
                greatest(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
      );

    if v_people_today >= v_people_limit then
      raise exception 'daily_people_limit';
    end if;
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_sender, p_body)
  returning id into v_msg;

  return v_msg;
end;
$$;

grant execute on function public.send_message(uuid, text) to authenticated;

-- ============================================================
-- PHOTO LIMITS follow the tier (3 / 6 / 8 / 10)
-- ============================================================
create or replace function public.enforce_photo_limit()
returns trigger as $$
declare
  v_count int;
  v_limit int;
begin
  select count(*) into v_count
  from public.photos
  where user_id = new.user_id;

  v_limit := case public.current_tier(new.user_id)
    when 'gold' then 6
    when 'platinum' then 8
    when 'diamond' then 10
    else 3
  end;

  if v_count >= v_limit then
    raise exception 'photo_limit_reached';
  end if;

  return new;
end;
$$ language plpgsql security definer
set search_path = public;

-- ============================================================
-- EVENT FLOORS are tier-gated (dance floor = silver = everyone)
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
  v_event_floor text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select status, token_cost, floor into v_event_status, v_cost, v_event_floor
  from public.events
  where id = p_event_id;

  if v_event_status is null then
    raise exception 'event_not_found';
  end if;
  if v_event_status <> 'open' then
    raise exception 'event_not_open';
  end if;

  -- Floor access: your tier must reach the event's floor.
  if public.tier_rank(public.current_tier(v_user)) <
     public.tier_rank(v_event_floor) then
    raise exception 'tier_required';
  end if;

  if exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = v_user
  ) then
    raise exception 'already_joined';
  end if;

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
