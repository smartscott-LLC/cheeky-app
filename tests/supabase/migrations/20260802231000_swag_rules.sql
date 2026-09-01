-- Swag Shop rule set — the "flag job" (founder 2026-08-02).
--
-- Per-item rules: WHO may hand an item out + WEEKLY quantity caps. Enforced
-- centrally in the engine, so it does not matter who is asking — even a
-- compromised caller gets flagged exactly like a confused AI. Owner-only
-- items are logged as flags the owner reviews (with the member and the
-- cast's reason), and the cast sees "can't do this — the owner's been
-- notified." Fail-closed: anything without a rule is owner-only.

-- The per-character budget table is superseded by item rules — drop it.
drop table if exists public.character_comp_budgets;

-- ============================================================
-- SWAG RULES — the item rule set (weekly caps are the club's stock)
-- ============================================================
create table public.swag_rules (
  benefit_type text not null check (benefit_type in ('membership', 'tokens', 'gift')),
  benefit_value text not null,
  owner_only boolean not null default true, -- true: owner/system only; cast gets flagged
  weekly_limit int,                          -- cast-only weekly cap; null = unlimited
  primary key (benefit_type, benefit_value)
);

alter table public.swag_rules enable row level security;
-- service-role only; no client policies.

insert into public.swag_rules (benefit_type, benefit_value, owner_only, weekly_limit) values
  ('membership', 'gold',          true,  null),
  ('membership', 'platinum',      true,  null),
  ('membership', 'diamond',       true,  null),
  ('tokens',     '20',            false, 5),
  ('tokens',     '50',            false, 3),
  ('tokens',     '100',           false, 1),
  ('gift',       'teddy',         false, 10),
  ('gift',       'golden_roses',  false, 5),
  ('gift',       'jewelry',       false, 2),
  ('gift',       'champagne',     true,  null),
  ('gift',       'gift_basket',   true,  null)
on conflict (benefit_type, benefit_value) do nothing;

-- ============================================================
-- SWAG FLAGS — the flag job: what the cast tried that needs the owner
-- ============================================================
create table public.swag_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- the member the cast wanted to help
  actor_ref text,                    -- character slug that was flagged
  benefit_type text not null check (benefit_type in ('membership', 'tokens', 'gift')),
  benefit_value text not null,
  reason text,                       -- why the cast wanted it, in their words
  status text not null default 'open' check (status in ('open', 'granted', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.swag_flags enable row level security;
-- service-role only; no client policies.

create or replace function public.flag_swag_request(
  p_user uuid,
  p_actor_ref text,
  p_benefit_type text,
  p_benefit_value text,
  p_reason text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.swag_flags (user_id, actor_ref, benefit_type, benefit_value, reason)
  values (p_user, p_actor_ref, p_benefit_type, p_benefit_value, p_reason);
end;
$$;

-- ============================================================
-- GENERATE SWAG CODE — replaced with rule-set enforcement.
--   owner / system: anything (the trusted key; still service-role only)
--   character: gifts + token bags within the item rules; owner-only items
--              raise owner_required (the caller flags + notifies the owner)
-- ============================================================
create or replace function public.generate_swag_code(
  p_benefit_type text,
  p_benefit_value text,
  p_actor_type text,
  p_actor_ref text default null,
  p_expires_at timestamptz default null,
  p_max_uses int default 1,
  p_notes text default null
) returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_owner_only boolean;
  v_weekly int;
  v_week_count int;
  v_code text;
begin
  select engine_enabled into v_enabled from public.promo_config where id = true;
  if v_enabled is false then
    raise exception 'engine_disabled';
  end if;

  -- Fail-closed rule lookup: unknown item => owner-only.
  select coalesce(r.owner_only, true), r.weekly_limit
    into v_owner_only, v_weekly
  from public.swag_rules r
  where r.benefit_type = p_benefit_type and r.benefit_value = p_benefit_value;
  if v_owner_only is null then
    v_owner_only := true;
  end if;

  if p_actor_type = 'character' then
    if v_owner_only then
      raise exception 'owner_required';
    end if;
    if v_weekly is not null then
      select count(*) into v_week_count
      from public.swag_codes
      where benefit_type = p_benefit_type
        and benefit_value = p_benefit_value
        and actor_type = 'character'
        and created_at >= date_trunc('week', now());
      if v_week_count >= v_weekly then
        raise exception 'weekly_limit_reached';
      end if;
    end if;
  elsif p_actor_type not in ('owner', 'system') then
    raise exception 'unknown_actor';
  end if;

  -- Validate the benefit shape (owner/system paths too).
  if p_benefit_type = 'membership' then
    if p_benefit_value not in ('gold', 'platinum', 'diamond') then
      raise exception 'invalid_tier';
    end if;
  elsif p_benefit_type = 'tokens' then
    if p_benefit_value !~ '^[0-9]+$' or p_benefit_value::int < 1 then
      raise exception 'invalid_amount';
    end if;
  elsif p_benefit_type = 'gift' then
    if not exists (select 1 from public.gift_catalog where slug = p_benefit_value and active) then
      raise exception 'gift_not_found';
    end if;
  else
    raise exception 'unknown_benefit';
  end if;

  v_code := 'SWAG-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.swag_codes
    (code, benefit_type, benefit_value, expires_at, max_uses, actor_type, actor_ref, notes)
  values
    (v_code, p_benefit_type, p_benefit_value, p_expires_at, p_max_uses,
     p_actor_type, p_actor_ref, p_notes);

  return v_code;
end;
$$;
