-- Harden bump_rate_limit (2026-08-08): it's member-callable (withinBudget
-- runs with the user session), but it accepted ARBITRARY keys — one member
-- could name another member's key ("report:user:<id>") and exhaust their
-- budget, or spam arbitrary rate_limits rows. Keys are internal namespaces
-- owned by the app; only known prefixes are accepted now. Matches the
-- revoke-definer pass: security-definer RPCs that members can reach must
-- not take caller-controlled names into shared state.

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
  -- Keys are app-owned namespaces ("agent:user:...", "report:user:...",
  -- "matchmaker:..."). Anything else is a caller trying to poke shared
  -- state — refuse it loudly.
  if p_key !~ '^(agent|report|matchmaker):' then
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
