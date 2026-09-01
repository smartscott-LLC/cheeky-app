-- Swag nuance (founder 2026-08-02): the cast can hand out gold memberships
-- for SPECIAL OCCASIONS only — short (2 days), not long-term. Owner/system
-- codes keep the full 30 days. Payment issues go to Stripe; extraordinary
-- gestures the owner sets in the DB directly.
create or replace function public.redeem_swag_code(p_code text)
returns table (benefit_type text, benefit_value text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.swag_codes%rowtype;
  v_days interval;
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

  -- Apply the benefit.
  if v_row.benefit_type = 'membership' then
    insert into public.entitlement_grants (user_id, tier, reason, expires_at)
    values (v_user, v_row.benefit_value, 'swag', now() + v_days);
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
     case when v_row.benefit_type = 'membership' then now() + v_days else null end);

  update public.swag_codes
  set used_count = used_count + 1,
      claimed_by_user_id = case when max_uses = 1 then v_user else claimed_by_user_id end,
      claimed_at = case when max_uses = 1 then now() else claimed_at end
  where id = v_row.id;

  return query select v_row.benefit_type, v_row.benefit_value;
end;
$$;

grant execute on function public.redeem_swag_code(text) to authenticated;
