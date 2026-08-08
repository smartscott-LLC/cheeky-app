-- L³ (Leave · Like · Love) — the three-card matchmaking mechanic.
-- PRD: docs/PRD-l3.md. Same spine as browse (one-way picks -> mutual match),
-- with a TIER award system: T1 = match + 5 free messages each, T2 = super
-- match = T1 + a floor-tiered gift. Leave is silent at every level.
-- All writes via security-definer RPCs (like create_like) — no direct
-- insert policies on the picks/rewards tables.

-- ============================================================
-- L3_PICKS — one ranked pick per (picker, target), immutable
-- ============================================================
create table public.l3_picks (
  id bigint generated always as identity primary key,
  picker_id uuid references auth.users(id) on delete cascade not null,
  target_id uuid references auth.users(id) on delete cascade not null,
  choice text not null check (choice in ('leave', 'like', 'love')),
  created_at timestamptz not null default now(),
  unique (picker_id, target_id),
  check (picker_id <> target_id)
);

alter table public.l3_picks enable row level security;

create policy "Read your own L3 picks"
  on public.l3_picks for select
  using (picker_id = auth.uid() or target_id = auth.uid());

-- ============================================================
-- MATCHES.tier — L³ matches carry their award tier (t1 / t2)
-- ============================================================
alter table public.matches
  add column if not exists tier text
  check (tier in ('t1', 't2'));

-- ============================================================
-- L3_REWARDS — the free line: 5 messages each, scoped to the match.
-- send_message consults this when a member is at the daily cap.
-- ============================================================
create table public.l3_rewards (
  id bigint generated always as identity primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  messages_left int not null default 5 check (messages_left >= 0),
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

alter table public.l3_rewards enable row level security;

create policy "Read your own L3 rewards"
  on public.l3_rewards for select
  using (user_id = auth.uid());

-- ============================================================
-- CREATE_L3_PICK — atomic pick + mutual match + tier rewards
-- ============================================================
create or replace function public.create_l3_pick(p_target uuid, p_choice text)
returns table (match_id uuid, tier text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_match uuid;
  v_tier text;
  v_mine text;
  v_theirs text;
  v_cat uuid;
  v_floor text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_user = p_target then
    raise exception 'cannot_pick_self';
  end if;
  if p_choice not in ('leave', 'like', 'love') then
    raise exception 'invalid_choice';
  end if;

  -- One pick per pair, immutable. Leave is silent — it never matches.
  insert into public.l3_picks (picker_id, target_id, choice)
  values (v_user, p_target, p_choice)
  on conflict (picker_id, target_id) do nothing;

  if p_choice = 'leave' then
    return query select null::uuid, null::text;
    return;
  end if;

  -- Did they pick me back with a real signal?
  select choice into v_theirs
  from public.l3_picks
  where picker_id = p_target and target_id = v_user;

  if v_theirs in ('like', 'love') then
    -- Tier: both love = T2 super match; anything else mutual = T1.
    v_tier := case
      when v_theirs = 'love' and p_choice = 'love' then 't2'
      else 't1'
    end;

    insert into public.matches (user_id_a, user_id_b, source, tier)
    values (least(v_user, p_target), greatest(v_user, p_target), 'l3', v_tier)
    on conflict (user_id_a, user_id_b) do update
    -- A later higher tier upgrades a lower one; browse matches get tiered too.
    set tier = case
      when public.matches.tier = 't2' or excluded.tier = 't2' then 't2'
      else 't1'
    end
    returning id into v_match;

    -- The free line — 5 messages each, scoped to this match.
    insert into public.l3_rewards (match_id, user_id, messages_left)
    values (v_match, v_user, 5), (v_match, p_target, 5)
    on conflict (match_id, user_id) do nothing;

    -- T2: the super match pops the cork — a floor-tiered gift for each.
    if v_tier = 't2' then
      for v_user in select u from (values (v_user), (p_target)) as t(u)
      loop
        v_floor := case public.current_tier(v_user)
          when 'gold' then 'gold'
          when 'platinum' then 'platinum'
          when 'diamond' then 'diamond'
          else 'silver'
        end;
        select id into v_cat
        from public.gift_catalog
        where floor = v_floor and kind = 'special' and active
        order by token_cost
        limit 1;
        if v_cat is not null then
          insert into public.gift_inventory (user_id, catalog_id, status)
          values (v_user, v_cat, 'available');
        end if;
      end loop;

      -- Wins are announced (silent loss, public win).
      insert into public.club_announcements (body, kind)
      values ('💘 A super match just happened at Club Cheeky!', 'gift');
    end if;
  end if;

  return query select v_match, v_tier;
end;
$$;

grant execute on function public.create_l3_pick(uuid, text) to authenticated;

-- ============================================================
-- L3_TRIO — three random compatible candidates, any floor.
-- SQL excludes: self, already-picked, blocked, unverified, photo-less,
-- bot-flagged. Compatibility (gender/interested_in) is applied client-side
-- for parity with the Spark List (isCompatible) — so we return a batch.
-- ============================================================
create or replace function public.l3_trio()
returns table (
  id uuid,
  display_name text,
  bio text,
  one_liner text,
  gender text,
  interested_in text,
  photo_path text
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select p.id,
         p.display_name,
         p.bio,
         p.one_liner,
         p.gender,
         p.interested_in,
         (select ph.storage_path
          from public.photos ph
          where ph.user_id = p.id
            and ph.held_at is null
          order by ph.is_primary desc, ph.position
          limit 1) as photo_path
  from public.profiles p
  where p.id <> v_user
    and p.verified_at is not null
    and p.bot_flagged_at is null
    and not exists (
      select 1 from public.l3_picks lp
      where lp.picker_id = v_user and lp.target_id = p.id
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = v_user and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = v_user)
    )
    and exists (
      select 1 from public.photos ph
      where ph.user_id = p.id and ph.held_at is null
    )
  order by random()
  limit 12;
end;
$$;

grant execute on function public.l3_trio() to authenticated;

-- ============================================================
-- SEND_MESSAGE — the T1/T2 free line: when at the daily cap, a match
-- with an L³ reward spends the allowance instead of refusing. Earned by
-- mutual consent, never sold — the cap stays for everything else.
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
    -- L³ reward: a matched free line bypasses the daily cap, one message at
    -- a time, up to its allowance (earned by mutual consent, never sold).
    if exists (
      select 1
      from public.l3_rewards r
      join public.matches m on m.id = r.match_id
      where r.user_id = v_sender
        and r.messages_left > 0
        and m.user_id_a = least(v_sender, v_other)
        and m.user_id_b = greatest(v_sender, v_other)
        and m.status = 'active'
    ) then
      update public.l3_rewards r
      set messages_left = r.messages_left - 1
      from public.matches m
      where r.match_id = m.id
        and r.user_id = v_sender
        and m.user_id_a = least(v_sender, v_other)
        and m.user_id_b = greatest(v_sender, v_other)
        and r.messages_left > 0;
    else
      raise exception 'daily_message_limit';
    end if;
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
