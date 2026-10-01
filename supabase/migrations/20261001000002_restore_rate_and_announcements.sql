-- Restore two live tables silently dropped by the 2026-09-22 "cleanup_database.sql"
-- sweep (full_cheeky repo), and repair the key allowlist in bump_rate_limit.
--
-- Damage assessed 2026-10-01:
--   * club_announcements — the overhead ticker ("public win" announcements).
--     Written by gifts, chat horn (app + webhook), read by events page, owner
--     tools, and the chub lounge ticker. Every insert has been failing since.
--   * rate_limits — backend table for bump_rate_limit + taskbar_state. Created
--     ad-hoc (no committed migration; schema reverse-engineered from the
--     deployed function bodies below). Every taskbar_state call has been
--     erroring since the drop.
--   * bump_rate_limit's regex (since 20260912000000) never learned the key
--     families the code later shipped: horn:user:, horn:shop:, horn:shop:full:
--     (gifts/chat horn 15-min cooldown) and swipes:{user}:cst (daily swipe
--     caps). Effect: horn purchases always failed, swipe caps always
--     fail-opened. Allowlist widened to match actual callers; the original
--     four prefixes are unchanged.

-- ── rate_limits (exact shape the deployed functions require) ─────
create table if not exists public.rate_limits (
  key text primary key,
  bucket_start timestamptz not null default now(),
  calls integer not null default 0
);
alter table public.rate_limits enable row level security;
-- No policies: clients never touch this table directly; access is exclusively
-- through the SECURITY DEFINER functions below (table owner bypasses RLS).

-- ── bump_rate_limit (same logic as 20260912000000, widened allowlist) ──
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
  if p_key !~ '^(agent|report|matchmaker|l3|horn|swipes):' then
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

-- ── club_announcements (restored verbatim from 20260914000001) ──
create table if not exists public.club_announcements (
  id bigint generated always as identity primary key,
  body text not null,
  kind text not null default 'gift',
  created_at timestamptz not null default now()
);

alter table public.club_announcements enable row level security;
create policy "Club announcements are public"
  on public.club_announcements for select
  using (true);
-- Writes come from service-role code paths (supabaseAdmin), which bypass RLS.
