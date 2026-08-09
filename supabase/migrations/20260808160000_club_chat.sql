-- Club Chat — the town square (2026-08-08). PRD: docs/PRD-club-chat.md.
-- The always-available real-time chat overlay: five rooms (global + the
-- four floor channels), the visibility ladder (type on your floor and
-- below; above is dimmed read-only — UI affordance; typing is gated HERE),
-- no caps or rate limits to talk (the room IS the retention play), standard
-- chat-room features (whispers, member presence via Realtime, context-menu
-- gift/report/block), the Horn (10 tokens, 1/hour, ticker), a chat-only
-- collectible badge family, and moderation surfaces (always-on profanity
-- filter + escalating chat bans). Take-private = a match behind TWO consent
-- dialogs (inviter + acceptor), counted against the daily allowances.
--
-- Realtime is enabled on the message tables (the app's first realtime
-- surface); RLS authorizes what each member sees.

-- ============================================================
-- BUMP_RATE_LIMIT — the Horn (1/hour) and the presence heartbeat (1/30s)
-- get namespaces of their own
-- ============================================================
create or replace function public.bump_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max int
) returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_row public.rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_key !~ '^(agent|report|matchmaker|horn|chat):' then
    raise exception 'invalid_rate_limit_key';
  end if;

  select * into v_row from public.rate_limits where key = p_key for update;

  if v_row is null or v_now - v_row.bucket_start > make_interval(secs => p_window_seconds) then
    insert into public.rate_limits (key, bucket_start, calls)
    values (p_key, v_now, 1)
    on conflict (key) do update
      set bucket_start = excluded.bucket_start, calls = 1;
    return true;
  end if;

  if v_row.calls < p_max then
    update public.rate_limits set calls = calls + 1 where key = p_key;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.bump_rate_limit(text, int, int) to authenticated;

-- ============================================================
-- BADGE CATALOG — book-ready columns + the chat collectible family
-- (family/floor metadata powers the future collectible book; chat badges
-- are their own family — never shared with streak/match/gift badges)
-- ============================================================
alter table public.badge_catalog
  add column if not exists family text not null default 'general',
  add column if not exists floor text
    check (floor is null or floor in ('silver', 'gold', 'platinum', 'diamond'));

insert into public.badge_catalog (slug, name, emoji, description, how_to_earn, family, floor) values
  ('chat_50',    'Chatterbox I',   '💬', '50 messages in Club Chat.',    'Send 50 messages in Club Chat.',   'chat', null),
  ('chat_200',   'Chatterbox II',  '🗣️', '200 messages in Club Chat.',   'Send 200 messages in Club Chat.',  'chat', null),
  ('chat_500',   'Chatterbox III', '📢', '500 messages in Club Chat.',   'Send 500 messages in Club Chat.',  'chat', null),
  ('chat_1000',  'Chatterbox IV',  '🏆', '1,000 messages in Club Chat.', 'Send 1,000 messages in Club Chat.', 'chat', null),
  ('chat_hour',  'The Regular',    '🍸', 'An hour in the room.',         'Spend an hour in Club Chat.',       'chat', null),
  ('chat_horn',  'Horn Blower',    '🎺', 'Sounded the Horn.',            'Blast the Horn once.',              'chat', null)
on conflict (slug) do nothing;

-- ============================================================
-- CLUB_CHAT_MESSAGES — one log per room (never per-user)
-- ============================================================
create table public.club_chat_messages (
  id bigint generated always as identity primary key,
  room text not null check (room in ('global', 'silver', 'gold', 'platinum', 'diamond')),
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  floor_tag text not null check (floor_tag in ('silver', 'gold', 'platinum', 'diamond')),
  horn boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.club_chat_messages enable row level security;

-- Verified members read every room (the dimmed upper floors are a UI
-- affordance — the DATA is visible so the climb can entice); block-aware
-- in both directions; inserts are RPC-only (the tier gate lives there).
create policy "Verified members read club chat"
  on public.club_chat_messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.verified_at is not null
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = club_chat_messages.sender_id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = club_chat_messages.sender_id)
    )
  );

create index club_chat_messages_room_created_idx
  on public.club_chat_messages (room, created_at desc);

-- ============================================================
-- CLUB_CHAT_WHISPERS — ephemeral pair rooms (in-room private)
-- ============================================================
create table public.club_chat_whispers (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references auth.users(id) on delete cascade not null,
  user_b uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.club_chat_whispers enable row level security;
create policy "Read your whisper rooms"
  on public.club_chat_whispers for select
  using (user_a = auth.uid() or user_b = auth.uid());

create table public.club_chat_whisper_messages (
  id bigint generated always as identity primary key,
  whisper_id uuid references public.club_chat_whispers(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.club_chat_whisper_messages enable row level security;
create policy "Read messages in your whisper rooms"
  on public.club_chat_whisper_messages for select
  using (
    exists (
      select 1 from public.club_chat_whispers w
      where w.id = whisper_id
        and (w.user_a = auth.uid() or w.user_b = auth.uid())
    )
  );

create index club_chat_whisper_messages_room_idx
  on public.club_chat_whisper_messages (whisper_id, created_at);

-- ============================================================
-- CLUB_CHAT_INVITES — take-private (a match behind two consents)
-- ============================================================
create table public.club_chat_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid references auth.users(id) on delete cascade not null,
  invitee_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (inviter_id, invitee_id)
);

alter table public.club_chat_invites enable row level security;
create policy "Read your private invites"
  on public.club_chat_invites for select
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

create index club_chat_invites_invitee_status_idx
  on public.club_chat_invites (invitee_id, status);

-- ============================================================
-- CLUB_CHAT_BANS — escalating chat bans (1 day → 3 days, moderator-set)
-- Deny-all RLS: only moderators/owner (service role) write; the send RPC
-- checks active bans. Bans are CHAT bans — never the platform.
-- ============================================================
create table public.club_chat_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  banned_until timestamptz not null,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.club_chat_bans enable row level security;

create index club_chat_bans_user_until_idx
  on public.club_chat_bans (user_id, banned_until);

-- ============================================================
-- CLUB_CHAT_BAN — moderator-only (service role / owner). Not member-callable.
-- ============================================================
create or replace function public.club_chat_ban(p_user uuid, p_hours int, p_reason text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if p_hours <= 0 or p_hours > 720 then
    raise exception 'invalid_ban_length';
  end if;
  insert into public.club_chat_bans (user_id, banned_until, reason, created_by)
  values (p_user, now() + make_interval(hours => p_hours), p_reason, auth.uid());
end;
$$;

revoke execute on function public.club_chat_ban(uuid, int, text) from anon, public, authenticated;
grant execute on function public.club_chat_ban(uuid, int, text) to service_role;

-- ============================================================
-- CLUB_CHAT_PROFANITY — the always-on filter. Not optional (founder). A
-- normalizer + word list catches the obvious; the crew AI and human
-- moderators catch the sneaks (chat bans escalate 1d → 3d).
-- ============================================================
create or replace function public.club_chat_profanity(p_body text)
returns boolean
language sql stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from unnest(array[
      'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'whore', 'slut', 'dick',
      'cock', 'pussy', 'faggot', 'nigga', 'nigger', 'kike', 'retard',
      'rape', 'killyourself', 'dieinafire'
    ]) as w(word)
    where regexp_replace(lower(p_body), '[^a-z0-9]', '', 'g') like '%' || w.word || '%'
  );
$$;

-- ============================================================
-- THE CHAT COUNTER — chat activity lives on the profile (survives the
-- 30-day purge), feeding the Chatterbox family. One honest bigint, no
-- new mechanics.
-- ============================================================
alter table public.profiles
  add column if not exists chat_messages_sent bigint not null default 0;

-- ============================================================
-- CLUB_CHAT_BUMP_BADGES — +1 and check the family thresholds. Internal.
-- ============================================================
create or replace function public.club_chat_bump_badges(p_user uuid)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_count bigint;
begin
  update public.profiles
  set chat_messages_sent = chat_messages_sent + 1
  where id = p_user
  returning chat_messages_sent into v_count;

  if v_count >= 1000 then
    perform public.award_badge(p_user, 'chat_1000');
  elsif v_count >= 500 then
    perform public.award_badge(p_user, 'chat_500');
  elsif v_count >= 200 then
    perform public.award_badge(p_user, 'chat_200');
  elsif v_count >= 50 then
    perform public.award_badge(p_user, 'chat_50');
  end if;
end;
$$;

revoke execute on function public.club_chat_bump_badges(uuid) from anon, public, authenticated;

-- ============================================================
-- CLUB_CHAT_TIME + HEARTBEAT — "The Regular" (an hour in the room).
-- The client heartbeats while the overlay is open; the daily tally
-- crossing 3600s awards the badge. Light, real, server-counted.
-- ============================================================
create table public.club_chat_time (
  user_id uuid references auth.users(id) on delete cascade not null,
  day date not null default current_date,
  seconds int not null default 0,
  primary key (user_id, day)
);

alter table public.club_chat_time enable row level security;

create or replace function public.club_chat_heartbeat(p_seconds int)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_total int;
  v_ok boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_seconds < 1 or p_seconds > 60 then
    raise exception 'invalid_heartbeat';
  end if;

  v_ok := public.bump_rate_limit('chat:hb:' || v_user, 30, 1);
  if not v_ok then
    return false;
  end if;

  insert into public.club_chat_time (user_id, day, seconds)
  values (v_user, current_date, p_seconds)
  on conflict (user_id, day) do update
    set seconds = public.club_chat_time.seconds + excluded.seconds
  returning seconds into v_total;

  if v_total >= 3600 then
    perform public.award_badge(v_user, 'chat_hour');
  end if;

  return true;
end;
$$;

grant execute on function public.club_chat_heartbeat(int) to authenticated;

-- ============================================================
-- CLUB_CHAT_SEND — the room's only write path. Tier gate, ban check,
-- profanity filter, badge grants. No rate limits — the room IS the
-- retention play; spam is a moderation problem, not a quota problem.
-- ============================================================
create or replace function public.club_chat_send(p_room text, p_body text)
returns bigint
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_tier text;
  v_msg bigint;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_user and verified_at is not null
  ) then
    raise exception 'verify_required';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then
    raise exception 'invalid_message_length';
  end if;
  if p_room not in ('global', 'silver', 'gold', 'platinum', 'diamond') then
    raise exception 'invalid_room';
  end if;

  -- The ladder: global is everyone's; otherwise your tier must reach the room.
  if p_room <> 'global'
     and public.tier_rank(public.current_tier(v_user)) < public.tier_rank(p_room) then
    raise exception 'floor_too_high';
  end if;

  -- Chat bans (moderator-set, escalating): you can't post while banned.
  if exists (
    select 1 from public.club_chat_bans
    where user_id = v_user and banned_until > now()
  ) then
    raise exception 'chat_banned';
  end if;

  -- The always-on filter. We do our part; the AI and the humans get the rest.
  if public.club_chat_profanity(p_body) then
    raise exception 'profanity_blocked';
  end if;

  v_tier := public.current_tier(v_user);
  if v_tier not in ('silver', 'gold', 'platinum', 'diamond') then
    v_tier := 'silver';
  end if;

  insert into public.club_chat_messages (room, sender_id, body, floor_tag)
  values (p_room, v_user, p_body, v_tier)
  returning id into v_msg;

  perform public.club_chat_bump_badges(v_user);

  return v_msg;
end;
$$;

grant execute on function public.club_chat_send(text, text) to authenticated;

-- ============================================================
-- CLUB_CHAT_WHISPER_GET — open (or reuse) an ephemeral pair room
-- ============================================================
create or replace function public.club_chat_whisper_get(p_other uuid)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_room uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_user = p_other then
    raise exception 'cannot_whisper_self';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_user and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;

  select id into v_room
  from public.club_chat_whispers
  where user_a = least(v_user, p_other)
    and user_b = greatest(v_user, p_other);

  if v_room is null then
    insert into public.club_chat_whispers (user_a, user_b)
    values (least(v_user, p_other), greatest(v_user, p_other))
    on conflict (user_a, user_b) do nothing
    returning id into v_room;
    if v_room is null then
      select id into v_room
      from public.club_chat_whispers
      where user_a = least(v_user, p_other)
        and user_b = greatest(v_user, p_other);
    end if;
  end if;

  return v_room;
end;
$$;

grant execute on function public.club_chat_whisper_get(uuid) to authenticated;

-- ============================================================
-- CLUB_CHAT_WHISPER_SEND — whisper message (ephemeral, no caps)
-- ============================================================
create or replace function public.club_chat_whisper_send(p_whisper_id uuid, p_body text)
returns bigint
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_msg bigint;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then
    raise exception 'invalid_message_length';
  end if;
  if not exists (
    select 1 from public.club_chat_whispers
    where id = p_whisper_id and (user_a = v_user or user_b = v_user)
  ) then
    raise exception 'not_in_whisper';
  end if;
  if public.club_chat_profanity(p_body) then
    raise exception 'profanity_blocked';
  end if;

  insert into public.club_chat_whisper_messages (whisper_id, sender_id, body)
  values (p_whisper_id, v_user, p_body)
  returning id into v_msg;

  perform public.club_chat_bump_badges(v_user);

  return v_msg;
end;
$$;

grant execute on function public.club_chat_whisper_send(uuid, text) to authenticated;

-- ============================================================
-- CLUB_CHAT_INVITE — take-private invite (the inviter's consent is the
-- dialog + this call). The MATCH lands on accept, where the acceptor's
-- consent is the dialog + their call — two-sided, on record.
-- ============================================================
create or replace function public.club_chat_invite(p_user uuid)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_invite uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_user = p_user then
    raise exception 'cannot_invite_self';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_user and verified_at is not null
  ) then
    raise exception 'invalid_target';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_user and b.blocked_id = p_user)
       or (b.blocker_id = p_user and b.blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;
  -- Already matched? No invite needed — just open the conversation.
  if exists (
    select 1 from public.matches
    where user_id_a = least(v_user, p_user)
      and user_id_b = greatest(v_user, p_user)
      and status = 'active'
  ) then
    raise exception 'already_matched';
  end if;

  insert into public.club_chat_invites (inviter_id, invitee_id)
  values (v_user, p_user)
  on conflict (inviter_id, invitee_id) do nothing
  returning id into v_invite;

  if v_invite is null then
    select id into v_invite
    from public.club_chat_invites
    where inviter_id = v_user and invitee_id = p_user;
  end if;

  return v_invite;
end;
$$;

grant execute on function public.club_chat_invite(uuid) to authenticated;

-- ============================================================
-- CLUB_CHAT_RESPOND_INVITE — accept = a match (both sides' daily
-- allowances checked — the anti-workaround); decline = silent.
-- ============================================================
create or replace function public.club_chat_respond_invite(p_invite_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.club_chat_invites%rowtype;
  v_conv uuid;
  v_party uuid;
  v_used int;
  v_limit int;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite
  from public.club_chat_invites
  where id = p_invite_id and invitee_id = v_user and status = 'pending'
  for update;
  if v_invite.id is null then
    raise exception 'invite_not_found';
  end if;

  if not p_accept then
    update public.club_chat_invites
    set status = 'declined', responded_at = now()
    where id = p_invite_id;
    return;
  end if;

  -- Both parties must have a new-people slot today: the invite counts
  -- against the daily allowances (the consent dialogs said so, on both
  -- sides). Used = distinct non-matched partners messaged today (the
  -- send_message rule) + matches created via Club Chat today.
  for v_party in (
    select unnest(array[v_invite.inviter_id, v_invite.invitee_id]) as id
  ) loop
    v_limit := case public.current_tier(v_party)
      when 'gold' then 15
      when 'platinum' then 40
      when 'diamond' then 100
      else 5
    end;

    select count(distinct partner.id) into v_used
    from (
      select case when c.user_id_a = v_party then c.user_id_b else c.user_id_a end as id
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id = v_party
        and m.created_at >= date_trunc('day', now())
        and not exists (
          select 1 from public.matches mt
          where mt.user_id_a = least(v_party, case when c.user_id_a = v_party then c.user_id_b else c.user_id_a end)
            and mt.user_id_b = greatest(v_party, case when c.user_id_a = v_party then c.user_id_b else c.user_id_a end)
        )
    ) partner;

    select v_used + count(*) into v_used
    from public.club_chat_invites i
    where i.status = 'accepted'
      and i.responded_at >= date_trunc('day', now())
      and (i.inviter_id = v_party or i.invitee_id = v_party);

    if v_used >= v_limit then
      raise exception 'daily_people_limit';
    end if;
  end loop;

  v_conv := public.get_or_create_conversation(v_invite.inviter_id);

  insert into public.matches (user_id_a, user_id_b, source)
  values (least(v_user, v_invite.inviter_id), greatest(v_user, v_invite.inviter_id), 'club_chat')
  on conflict (user_id_a, user_id_b) do nothing;

  update public.club_chat_invites
  set status = 'accepted', responded_at = now()
  where id = p_invite_id;
end;
$$;

grant execute on function public.club_chat_respond_invite(uuid, boolean) to authenticated;

-- ============================================================
-- CLUB_CHAT_HORN 🎺 — 10 tokens, one per hour, lights up in the Global
-- room and crosses the club ticker. The room's only token-touch.
-- ============================================================
create or replace function public.club_chat_horn(p_body text)
returns bigint
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_balance int;
  v_holds int;
  v_ok boolean;
  v_tier text;
  v_msg bigint;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_user and verified_at is not null
  ) then
    raise exception 'verify_required';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then
    raise exception 'invalid_message_length';
  end if;

  -- One blast per hour — no 100-token whale spamming the ticker.
  v_ok := public.bump_rate_limit('horn:user:' || v_user, 3600, 1);
  if not v_ok then
    raise exception 'horn_cooldown';
  end if;

  -- 10 tokens, server-side ledger, holds respected.
  select coalesce(sum(delta), 0) into v_balance
  from public.token_ledger
  where user_id = v_user;

  select coalesce(sum(e.token_cost), 0) into v_holds
  from public.event_entries ee
  join public.events e on e.id = ee.event_id
  where ee.user_id = v_user and ee.status = 'reserved';

  if v_balance - v_holds < 10 then
    raise exception 'insufficient_tokens';
  end if;

  insert into public.token_ledger (user_id, delta, reason, ref)
  values (v_user, -10, 'horn', null);

  v_tier := public.current_tier(v_user);
  if v_tier not in ('silver', 'gold', 'platinum', 'diamond') then
    v_tier := 'silver';
  end if;

  insert into public.club_chat_messages (room, sender_id, body, floor_tag, horn)
  values ('global', v_user, p_body, v_tier, true)
  returning id into v_msg;

  insert into public.club_announcements (body, kind)
  values ('🎺 ' || p_body, 'horn');

  perform public.award_badge(v_user, 'chat_horn');
  perform public.club_chat_bump_badges(v_user);

  return v_msg;
end;
$$;

grant execute on function public.club_chat_horn(text) to authenticated;

-- ============================================================
-- REALTIME — the app's first realtime surface, scoped tight: room
-- messages + whispers broadcast; RLS decides who sees what (verified,
-- block-aware); presence (the member list) is client-side.
-- ============================================================
alter publication supabase_realtime add table public.club_chat_messages;
alter publication supabase_realtime add table public.club_chat_whisper_messages;

-- ============================================================
-- RETENTION — 30-day logs, nightly purge (24h visible is the client's
-- read window; older logs are request-only per PRD §9).
-- ============================================================
select cron.schedule('cheeky_club_chat_purge', '0 4 * * *', $$
  delete from public.club_chat_whisper_messages where created_at < now() - interval '30 days';
  delete from public.club_chat_whispers where created_at < now() - interval '30 days';
  delete from public.club_chat_messages where created_at < now() - interval '30 days';
  delete from public.club_chat_invites where created_at < now() - interval '30 days';
$$);
