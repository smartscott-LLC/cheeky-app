-- Rate/abuse limits (audit #9): a tiny generic fixed-window limiter used by
-- the money-burning and safety-critical endpoints — the AI agent route
-- (/api/agent) and the report desk (DateSafe). Same philosophy as the
-- messaging caps: enforced server-side, never trusted to the client.
--
-- The table carries NO client policies — it is written only through the
-- SECURITY DEFINER RPC below (like token_ledger / swag_codes).

create table public.rate_limits (
  key text primary key,
  bucket_start timestamptz not null default now(),
  calls int not null default 1
);
alter table public.rate_limits enable row level security;

-- Bumps the counter for p_key inside a fixed window of p_window_seconds.
-- Returns true when the call is within budget (and the counter was
-- incremented); false when the window is spent. Atomic: the row lock
-- serializes concurrent callers so a burst can't slip past the cap.
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

-- Housekeeping: sweep windows that went stale so the table never grows with
-- the departed (hourly, like the event keepers).
create extension if not exists pg_cron;
select cron.schedule('cheeky_rate_limit_cleanup', '17 * * * *', $$
  delete from public.rate_limits where bucket_start < now() - interval '24 hours'
$$);
