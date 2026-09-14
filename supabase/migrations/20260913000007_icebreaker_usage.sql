-- Icebreaker daily usage tracking
-- Caps: silver=5, gold=10, platinum=∞, diamond=∞
-- Reset at midnight CST via taskbar_state RPC

create table if not exists public.icebreaker_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  used bigint not null default 0,
  constraint icebreaker_usage_user_day_key unique (user_id, day)
);

alter table public.icebreaker_usage enable row level security;

create policy "Users can read their own icebreaker usage"
  on public.icebreaker_usage for select
  to authenticated using (auth.uid() = user_id);

create policy "Users can upsert their own icebreaker usage"
  on public.icebreaker_usage for all
  to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.use_icebreaker()
returns void
language plpgsql security definer
as $$
declare
  v_user uuid := auth.uid();
  v_cst_midnight timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_cst_midnight := (now() AT TIME ZONE 'America/Chicago')::date::timestamptz AT TIME ZONE 'UTC';
  insert into public.icebreaker_usage (user_id, day, used)
    values (v_user, current_date, 1)
    on conflict (user_id, day)
    do update set used = icebreaker_usage.used + 1;
end;
$$;

grant execute on function public.use_icebreaker() to authenticated;
