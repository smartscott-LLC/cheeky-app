-- Swag code hardening (2026-08-08, founder):
--   1. Codes expire: every minted code defaults to a 30-day window to use
--      (callers can still pass an explicit p_expires_at; an owner needing
--      "never" passes a far-future date). Redeem already refused expired
--      codes — the gap was that minting defaulted to NULL = forever.
--   2. Fail-closed gifts: if a gift slug is renamed or deactivated after a
--      code was minted, redemption used to insert a gift_inventory row with
--      a NULL catalog_id — a silent broken grant. Now it raises
--      'gift_unavailable' and rolls back the whole redeem (no partial
--      grants), so the member is never silently shorted and the owner sees
--      the failure in the logs.
--   3. The owner can see them: swag_codes_stale lists unredeemed codes
--      whose gift benefit no longer resolves to an active catalog item,
--      surfaced in the Owner's Booth.

-- ============================================================
-- GENERATE SWAG CODE — 30-day default expiry
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
  v_payload jsonb;
  v_tokens int;
  v_membership text;
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
  elsif p_benefit_type = 'bundle' then
    -- Bundles are the owner's gesture — never the cast's.
    if p_actor_type = 'character' then
      raise exception 'character_cannot_grant_this';
    end if;
    begin
      v_payload := p_benefit_value::jsonb;
    exception when others then
      raise exception 'invalid_bundle';
    end;
    v_tokens := 0;
    if v_payload ? 'tokens' then
      if (v_payload->>'tokens') !~ '^[0-9]+$' then
        raise exception 'invalid_amount';
      end if;
      v_tokens := (v_payload->>'tokens')::int;
    end if;
    v_membership := coalesce(v_payload->>'membership', '');
    if v_membership <> '' and v_membership not in ('gold', 'platinum', 'diamond') then
      raise exception 'invalid_tier';
    end if;
    if v_payload ? 'gifts' then
      if jsonb_typeof(v_payload->'gifts') <> 'array' then
        raise exception 'invalid_bundle';
      end if;
      if exists (
        select 1
        from jsonb_array_elements_text(v_payload->'gifts') g
        where not exists (
          select 1 from public.gift_catalog where slug = g and active
        )
      ) then
        raise exception 'gift_not_found';
      end if;
    end if;
    if v_tokens = 0 and v_membership = '' and not v_payload ? 'gifts' then
      raise exception 'empty_bundle';
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

  -- Every code has a window to be used: 30 days by default.
  insert into public.swag_codes
    (code, benefit_type, benefit_value, expires_at, max_uses, actor_type, actor_ref, notes)
  values
    (v_code, p_benefit_type, p_benefit_value,
     coalesce(p_expires_at, now() + interval '30 days'),
     p_max_uses, p_actor_type, p_actor_ref, p_notes);

  return v_code;
end;
$$;

grant execute on function public.generate_swag_code(text, text, text, text, timestamptz, int, text) to authenticated;

-- ============================================================
-- REDEEM SWAG CODE — fail-closed gifts (never a NULL catalog_id)
-- ============================================================
create or replace function public.redeem_swag_code(p_code text)
returns table (benefit_type text, benefit_value text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.swag_codes%rowtype;
  v_days interval;
  v_payload jsonb;
  v_tokens int;
  v_gift text;
  v_membership text;
  v_catalog_id uuid;
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

  -- Membership duration by actor: cast = special-occasion 2 days,
  -- owner/system = the real 30-day grant.
  v_days := case when v_row.actor_type = 'character' then interval '2 days'
                 else interval '30 days'
            end;

  -- Apply the benefit. Gift slugs must still resolve to an ACTIVE catalog
  -- item — a renamed/deactivated gift fails the whole redeem closed, never
  -- a null catalog_id row.
  if v_row.benefit_type = 'membership' then
    insert into public.entitlement_grants (user_id, tier, reason, expires_at)
    values (v_user, v_row.benefit_value, 'swag', now() + v_days);
  elsif v_row.benefit_type = 'tokens' then
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (v_user, v_row.benefit_value::int, 'swag', null);
  elsif v_row.benefit_type = 'gift' then
    select id into v_catalog_id
    from public.gift_catalog where slug = v_row.benefit_value and active;
    if v_catalog_id is null then
      raise exception 'gift_unavailable';
    end if;
    insert into public.gift_inventory (user_id, catalog_id, status)
    values (v_user, v_catalog_id, 'available');
  elsif v_row.benefit_type = 'bundle' then
    v_payload := v_row.benefit_value::jsonb;
    v_tokens := coalesce((v_payload->>'tokens')::int, 0);
    v_membership := coalesce(v_payload->>'membership', '');
    if v_tokens > 0 then
      insert into public.token_ledger (user_id, delta, reason, ref)
      values (v_user, v_tokens, 'swag', null);
    end if;
    if v_membership <> '' then
      insert into public.entitlement_grants (user_id, tier, reason, expires_at)
      values (v_user, v_membership, 'swag', now() + v_days);
    end if;
    if jsonb_typeof(v_payload->'gifts') = 'array' then
      for v_gift in select jsonb_array_elements_text(v_payload->'gifts') loop
        select id into v_catalog_id
        from public.gift_catalog where slug = v_gift and active;
        if v_catalog_id is null then
          raise exception 'gift_unavailable';
        end if;
        insert into public.gift_inventory (user_id, catalog_id, status)
        values (v_user, v_catalog_id, 'available');
      end loop;
    end if;
  end if;

  insert into public.benefit_grants
    (user_id, benefit_type, benefit_value, reason, actor_type, actor_ref, code_id, expires_at)
  values
    (v_user, v_row.benefit_type, v_row.benefit_value, 'swag',
     v_row.actor_type, v_row.actor_ref, v_row.id,
     case when v_row.benefit_type in ('membership', 'bundle') then now() + v_days else null end);

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
-- SWAG_CODES_STALE — unredeemed codes whose gift benefit no longer
-- resolves to an active catalog item (renamed/deactivated since mint).
-- Owner's Booth surfaces this; service-role only.
-- ============================================================
create or replace view public.swag_codes_stale as
select id, code, benefit_type, benefit_value, actor_type, actor_ref,
       notes, created_at, expires_at
from public.swag_codes sc
where used_count = 0
  and (
    (benefit_type = 'gift' and not exists (
      select 1 from public.gift_catalog g where g.slug = sc.benefit_value and g.active
    ))
    or (benefit_type = 'bundle' and (
      not (sc.benefit_value ~ '^\{')
      or exists (
        select 1
        from jsonb_array_elements_text(
          case when sc.benefit_value ~ '^\{' and jsonb_typeof(sc.benefit_value::jsonb) = 'object'
               then coalesce(sc.benefit_value::jsonb->'gifts', '[]'::jsonb)
               else '[]'::jsonb
          end
        ) g
        where not exists (
          select 1 from public.gift_catalog gc where gc.slug = g and gc.active
        )
      )
    ))
  );

grant select on public.swag_codes_stale to service_role;
