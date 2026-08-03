-- BOT GUARD + the one-liner (founder 2026-08-03).
--
-- Honeypots: hidden form fields humans never see. Bots (who sign up with
-- real IDs then automate) fill them. A filled honeypot = caught: logged,
-- the account flagged, and the activity guards shut the account down —
-- no likes, no messages, no waves, no event entry.
--
-- The one-liner: a short pickup-line bio that gives people insight fast.

-- ============================================================
-- HONEYPOT LOG + BOT FLAG
-- ============================================================
create table public.honeypot_catches (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  field text not null,
  page text not null,
  created_at timestamptz not null default now()
);

alter table public.honeypot_catches enable row level security;
-- service-role only; no client policies.

alter table public.profiles
  add column bot_flagged_at timestamptz,
  add column one_liner text;

-- Flag + log a catch (service-role only — the forms call this server-side).
create or replace function public.flag_honeypot_catch(
  p_user uuid,
  p_field text,
  p_page text,
  p_email text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.honeypot_catches (user_id, email, field, page)
  values (p_user, p_email, p_field, p_page);
  if p_user is not null then
    update public.profiles
    set bot_flagged_at = now()
    where id = p_user and bot_flagged_at is null;
  end if;
end;
$$;

-- ============================================================
-- ACTIVITY GUARD — flagged bots get shut down at the door
-- ============================================================
create or replace function public.handle_bot_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(
    new.sender_id, new.picker_id, new.liker_id, new.user_id, new.host_id
  );
begin
  if v_user is not null and exists (
    select 1 from public.profiles
    where id = v_user and bot_flagged_at is not null
  ) then
    raise exception 'account_suspended';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bot_guard_messages on public.messages;
create trigger trg_bot_guard_messages before insert on public.messages
  for each row execute function public.handle_bot_guard();
drop trigger if exists trg_bot_guard_likes on public.likes;
create trigger trg_bot_guard_likes before insert on public.likes
  for each row execute function public.handle_bot_guard();
drop trigger if exists trg_bot_guard_waves on public.waves;
create trigger trg_bot_guard_waves before insert on public.waves
  for each row execute function public.handle_bot_guard();
drop trigger if exists trg_bot_guard_events on public.event_entries;
create trigger trg_bot_guard_events before insert on public.event_entries
  for each row execute function public.handle_bot_guard();
