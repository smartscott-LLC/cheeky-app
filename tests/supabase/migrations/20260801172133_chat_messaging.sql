-- Chat & messaging (Phase 1D).
-- Matched pairs chat freely; cold messages (unmatched) are capped at
-- 5/day server-side. Writes go through RPCs — no direct insert policies
-- on conversations/messages. Block-aware, retention-purged via pg_cron.

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid references auth.users(id) on delete cascade not null,
  user_id_b uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  check (user_id_a < user_id_b),
  unique (user_id_a, user_id_b)
);

alter table public.conversations enable row level security;

create policy "Read your conversations"
  on public.conversations for select
  using (user_id_a = auth.uid() or user_id_b = auth.uid());

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Read messages in your conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_id_a = auth.uid() or c.user_id_b = auth.uid())
    )
  );

-- ============================================================
-- BLOCKS & REPORTS (governance: report/block from any chat)
-- ============================================================
create table public.blocks (
  id bigint generated always as identity primary key,
  blocker_id uuid references auth.users(id) on delete cascade not null,
  blocked_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "Read your blocks"
  on public.blocks for select
  using (blocker_id = auth.uid());
create policy "Block someone"
  on public.blocks for insert
  with check (blocker_id = auth.uid());

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users(id) on delete cascade not null,
  reported_id uuid references auth.users(id) on delete cascade not null,
  reason text not null,
  context text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "File a report"
  on public.reports for insert
  with check (reporter_id = auth.uid());
-- No select policy: reports are only read by moderation (service role).

-- ============================================================
-- GET_OR_CREATE_CONVERSATION RPC
-- ============================================================
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_conv uuid;
begin
  if v_sender is null then
    raise exception 'not_authenticated';
  end if;
  if v_sender = p_other then
    raise exception 'cannot_message_self';
  end if;

  select id into v_conv
  from public.conversations
  where user_id_a = least(v_sender, p_other)
    and user_id_b = greatest(v_sender, p_other);

  if v_conv is null then
    insert into public.conversations (user_id_a, user_id_b)
    values (least(v_sender, p_other), greatest(v_sender, p_other))
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_conv;

    if v_conv is null then
      select id into v_conv
      from public.conversations
      where user_id_a = least(v_sender, p_other)
        and user_id_b = greatest(v_sender, p_other);
    end if;
  end if;

  return v_conv;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ============================================================
-- SEND_MESSAGE RPC — matched: unlimited; cold: 5/day; block-aware
-- ============================================================
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_other uuid;
  v_matched boolean;
  v_sent_today int;
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

  select exists (
    select 1 from public.matches
    where user_id_a = least(v_sender, v_other)
      and user_id_b = greatest(v_sender, v_other)
      and status = 'active'
  ) into v_matched;

  if not v_matched then
    select count(*) into v_sent_today
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

    if v_sent_today >= 5 then
      raise exception 'daily_message_limit';
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
-- RETENTION PURGE — nightly, stricter participant window wins
-- ============================================================
create extension if not exists pg_cron;

select cron.schedule('cheeky_purge_messages', '0 3 * * *', $$
  delete from public.messages m
  using public.conversations c, public.profiles pa, public.profiles pb
  where m.conversation_id = c.id
    and pa.id = c.user_id_a
    and pb.id = c.user_id_b
    and m.created_at <
      now() - make_interval(days => least(pa.message_retention_days, pb.message_retention_days))
$$);
