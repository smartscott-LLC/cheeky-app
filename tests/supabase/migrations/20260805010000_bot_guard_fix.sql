-- Bot-guard fix (caught by the token-engine test, 2026-08-05): the guard
-- read new.sender_id unconditionally, but likes (liker_id) and event_entries
-- (user_id) have no such column — so EVERY like and EVERY event join raised
-- "record 'new' has no field 'sender_id'" and died. The guard now reads the
-- user-id column by name (passed per trigger via tg_argv) from the row as
-- jsonb, where a missing key is NULL instead of an error.

create or replace function public.handle_bot_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  v_user := (to_jsonb(new) ->> tg_argv[0])::uuid;
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
  for each row execute function public.handle_bot_guard('sender_id');
drop trigger if exists trg_bot_guard_likes on public.likes;
create trigger trg_bot_guard_likes before insert on public.likes
  for each row execute function public.handle_bot_guard('liker_id');
drop trigger if exists trg_bot_guard_waves on public.waves;
create trigger trg_bot_guard_waves before insert on public.waves
  for each row execute function public.handle_bot_guard('sender_id');
drop trigger if exists trg_bot_guard_events on public.event_entries;
create trigger trg_bot_guard_events before insert on public.event_entries
  for each row execute function public.handle_bot_guard('user_id');
