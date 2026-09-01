-- Honeypot signature fix: the signup honeypot fires BEFORE a user exists,
-- so p_user must be optional (trailing default). Profile catches pass it.
create or replace function public.flag_honeypot_catch(
  p_field text,
  p_page text,
  p_email text default null,
  p_user uuid default null
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
