-- The Swag Shop (Generosity Engine, simplified per founder 2026-08-02):
-- ONE room, ONE universal unit — the code. "Input what it gives -> a code is
-- generated and tied to it." Codes bypass Stripe; redemption applies the
-- benefit straight to the database and writes an audit row. Easy to create,
-- easy to log, easy to track. Same shop everywhere, no per-floor logic.
--
-- Benefit types: membership (30-day entitlement grant) | tokens | gift.
-- Verification is NOT a code — that door stays a real ID check (governance).
--
-- Actors: owner / system (anything) | character (gifts only, monthly budget).
-- Engine has a fail-closed kill switch (promo_config.engine_enabled).

-- ============================================================
-- SWAG CODES — the unit of giving
-- ============================================================
create table public.swag_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- human-shareable: SWAG-XXXXXXXX
  benefit_type text not null check (benefit_type in ('membership', 'tokens', 'gift')),
  benefit_value text not null,          -- tier | token amount | gift slug
  expires_at timestamptz,               -- null = never expires
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  actor_type text not null check (actor_type in ('owner', 'character', 'system')),
  actor_ref text,                       -- character slug when actor_type = 'character'
  notes text,
  created_at timestamptz not null default now(),
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

alter table public.swag_codes enable row level security;
-- No client policies: generation and redemption are RPC-only (service role /
-- authenticated redeem). Members can never mint or read codes directly.

-- ============================================================
-- BENEFIT GRANTS — the audit log (governance docs for free)
-- ============================================================
create table public.benefit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  benefit_type text not null check (benefit_type in ('membership', 'tokens', 'gift')),
  benefit_value text not null,
  reason text not null default 'swag',
  actor_type text not null check (actor_type in ('owner', 'character', 'system')),
  actor_ref text,
  code_id uuid references public.swag_codes(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.benefit_grants enable row level security;
create policy "Read your own swag history"
  on public.benefit_grants for select using (user_id = auth.uid());

-- ============================================================
-- CHARACTER COMP BUDGETS — how much each cast member can give per month
-- (token-worth). 0 = no comp power. The budget is what makes the AI reason.
-- ============================================================
create table public.character_comp_budgets (
  character_id uuid references public.characters(id) on delete cascade not null primary key,
  monthly_limit int not null default 0 check (monthly_limit >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.character_comp_budgets enable row level security;
-- service-role only; no client policies.

insert into public.character_comp_budgets (character_id, monthly_limit)
select id, case slug
  when 'chaz' then 2000   -- the manager smooths things over
  when 'trixie' then 500  -- the floor scout tips struggling members
  else 0                  -- Brutus protects, the DJ spins, Valentina hosts
end
from public.characters
on conflict (character_id) do nothing;

-- ============================================================
-- PROMO CONFIG — fail-closed kill switch (singleton)
-- ============================================================
create table public.promo_config (
  id boolean primary key default true check (id),
  engine_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.promo_config enable row level security;
-- service-role only; no client policies.

insert into public.promo_config (id, engine_enabled) values (true, true)
on conflict (id) do nothing;

-- ============================================================
-- GENERATE SWAG CODE — actor-gated. Service-role / agent only.
--   owner / system: membership (gold|platinum|diamond), tokens, gifts
--   character: gifts only, within monthly budget
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
  v_worth int;
  v_spent int;
  v_limit int;
  v_code text;
begin
  select engine_enabled into v_enabled from public.promo_config where id = true;
  if v_enabled is false then
    raise exception 'engine_disabled';
  end if;

  -- Validate the benefit shape first.
  if p_benefit_type = 'membership' then
    if p_benefit_value not in ('gold', 'platinum', 'diamond') then
      raise exception 'invalid_tier';
    end if;
  elsif p_benefit_type = 'tokens' then
    if p_benefit_value !~ '^[0-9]+$' or p_benefit_value::int < 1 then
      raise exception 'invalid_amount';
    end if;
  elsif p_benefit_type = 'gift' then
    select token_cost into v_worth
    from public.gift_catalog where slug = p_benefit_value and active;
    if v_worth is null then
      raise exception 'gift_not_found';
    end if;
  else
    raise exception 'unknown_benefit';
  end if;

  if p_actor_type = 'character' then
    -- Cast can only give gifts, and only within their monthly budget.
    if p_benefit_type <> 'gift' then
      raise exception 'character_cannot_grant_this';
    end if;
    select coalesce(sum(g.token_cost), 0) into v_spent
    from public.swag_codes sc
    join public.gift_catalog g on g.slug = sc.benefit_value
    where sc.actor_type = 'character'
      and sc.actor_ref = p_actor_ref
      and sc.created_at >= date_trunc('month', now());
    select cb.monthly_limit into v_limit
    from public.character_comp_budgets cb
    join public.characters c on c.id = cb.character_id
    where c.slug = p_actor_ref and cb.active;
    if v_limit is null or v_spent + v_worth > v_limit then
      raise exception 'budget_exhausted';
    end if;
  elsif p_actor_type not in ('owner', 'system') then
    raise exception 'unknown_actor';
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

-- ============================================================
-- REDEEM SWAG CODE — member-facing. Applies the benefit + audits.
-- ============================================================
create or replace function public.redeem_swag_code(p_code text)
returns table (benefit_type text, benefit_value text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.swag_codes%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.promo_config where id = true and engine_enabled
  ) then
    raise exception 'engine_disabled';
  end if;

  select * into v_row
  from public.swag_codes
  where code = upper(trim(p_code))
  for update;

  if v_row is null then
    raise exception 'code_not_found';
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    raise exception 'code_expired';
  end if;
  if v_row.used_count >= v_row.max_uses then
    raise exception 'code_used';
  end if;
  if exists (
    select 1 from public.benefit_grants
    where code_id = v_row.id and user_id = v_user
  ) then
    raise exception 'already_redeemed';
  end if;

  -- Apply the benefit.
  if v_row.benefit_type = 'membership' then
    insert into public.entitlement_grants (user_id, tier, reason, expires_at)
    values (v_user, v_row.benefit_value, 'swag', now() + interval '30 days');
  elsif v_row.benefit_type = 'tokens' then
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (v_user, v_row.benefit_value::int, 'swag', null);
  elsif v_row.benefit_type = 'gift' then
    insert into public.gift_inventory (user_id, catalog_id, status)
    values (v_user, (select id from public.gift_catalog where slug = v_row.benefit_value), 'available');
  end if;

  insert into public.benefit_grants
    (user_id, benefit_type, benefit_value, reason, actor_type, actor_ref, code_id, expires_at)
  values
    (v_user, v_row.benefit_type, v_row.benefit_value, 'swag',
     v_row.actor_type, v_row.actor_ref, v_row.id,
     case when v_row.benefit_type = 'membership' then now() + interval '30 days' else null end);

  update public.swag_codes
  set used_count = used_count + 1,
      claimed_by_user_id = case when max_uses = 1 then v_user else claimed_by_user_id end,
      claimed_at = case when max_uses = 1 then now() else claimed_at end
  where id = v_row.id;

  return query select v_row.benefit_type, v_row.benefit_value;
end;
$$;

grant execute on function public.redeem_swag_code(text) to authenticated;

-- ============================================================
-- OWNER GRANT — the owner applies a benefit directly (no code). Owner's key.
-- ============================================================
create or replace function public.owner_grant(
  p_user uuid,
  p_benefit_type text,
  p_benefit_value text,
  p_reason text default 'owner',
  p_days int default 30
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select engine_enabled into v_enabled from public.promo_config where id = true;
  if v_enabled is false then
    raise exception 'engine_disabled';
  end if;

  if p_benefit_type = 'membership' then
    if p_benefit_value not in ('gold', 'platinum', 'diamond') then
      raise exception 'invalid_tier';
    end if;
    insert into public.entitlement_grants (user_id, tier, reason, expires_at)
    values (p_user, p_benefit_value, p_reason, now() + (p_days || ' days')::interval);
  elsif p_benefit_type = 'tokens' then
    if p_benefit_value !~ '^[0-9]+$' or p_benefit_value::int < 1 then
      raise exception 'invalid_amount';
    end if;
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (p_user, p_benefit_value::int, p_reason, null);
  elsif p_benefit_type = 'gift' then
    if not exists (select 1 from public.gift_catalog where slug = p_benefit_value and active) then
      raise exception 'gift_not_found';
    end if;
    insert into public.gift_inventory (user_id, catalog_id, status)
    values (p_user, (select id from public.gift_catalog where slug = p_benefit_value), 'available');
  else
    raise exception 'unknown_benefit';
  end if;

  insert into public.benefit_grants
    (user_id, benefit_type, benefit_value, reason, actor_type, actor_ref, expires_at)
  values
    (p_user, p_benefit_type, p_benefit_value, p_reason, 'owner', null,
     case when p_benefit_type = 'membership' then now() + (p_days || ' days')::interval else null end);
end;
$$;
-- No authenticated grant: owner_grant is service-role / ADMIN_KEY-gated only.
