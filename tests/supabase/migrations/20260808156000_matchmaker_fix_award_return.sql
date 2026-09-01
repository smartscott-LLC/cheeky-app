-- Fix (2026-08-08, found by tests/matchmaker.live.test.mjs): award_gift's
-- final `insert ... returning id;` had no destination — in PL/pgSQL a bare
-- RETURNING (without INTO) is a result-less statement, so calling the
-- function raised 42601 "query has no destination for result data" on both
-- the accept and decline paths. Capture the id and RETURN it.

drop function if exists public.matchmaker_award_gift(uuid, text);

create or replace function public.matchmaker_award_gift(p_user uuid, p_floor text)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_catalog uuid;
  v_inv uuid;
begin
  select id into v_catalog
  from public.gift_catalog
  where slug = 'matchmaker_' || p_floor
    and matchmaker_only
    and active;
  if v_catalog is null then
    raise exception 'matchmaker_gift_missing';
  end if;

  insert into public.gift_inventory (user_id, catalog_id, status)
  values (p_user, v_catalog, 'available')
  returning id into v_inv;

  return v_inv;
end;
$$;

revoke execute on function public.matchmaker_award_gift(uuid, text) from anon, public, authenticated;
