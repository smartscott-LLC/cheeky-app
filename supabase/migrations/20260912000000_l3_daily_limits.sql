-- Add L3 trio daily play limits by tier.
-- Rates: silver=4, gold=8, platinum=12, diamond=15 per 24h.
-- Also add 'l3' to the bump_rate_limit key allowlist.

-- 1. Expand bump_rate_limit to accept l3: keys
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
  if p_key !~ '^(agent|report|matchmaker|l3):' then
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

-- 2. Add daily play cap to l3_trio()
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
  v_tier text;
  v_plays int;
  v_ok boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  v_tier := public.current_tier(v_user);
  v_plays := case v_tier
    when 'gold' then 8
    when 'platinum' then 12
    when 'diamond' then 15
    else 4
  end;
  v_ok := public.bump_rate_limit('l3:trios:' || v_user, 86400, v_plays);
  if not v_ok then
    raise exception 'daily_trios_limit';
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
