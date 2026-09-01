-- Fix: create_l3_pick raised 42702 "column reference \"match_id\" is
-- ambiguous" on the first MUTUAL pick — the ON CONFLICT column list
-- (match_id, user_id) collided with the function's RETURNS TABLE output
-- parameter named match_id (a known PL/pgSQL gotcha: ON CONFLICT targets
-- are parsed in a context where output params are in scope).
--
-- Fix: target the unique constraint by name instead of by column list.
-- Output params, the RPC JSON contract (match_id, tier), and the client
-- code are untouched. Found by tests/l3.live.test.mjs — the match path
-- had never been exercised end-to-end before (single picks never hit it).

create or replace function public.create_l3_pick(p_target uuid, p_choice text)
returns table (match_id uuid, tier text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_match uuid;
  v_tier text;
  v_mine text;
  v_theirs text;
  v_cat uuid;
  v_floor text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_user = p_target then
    raise exception 'cannot_pick_self';
  end if;
  if p_choice not in ('leave', 'like', 'love') then
    raise exception 'invalid_choice';
  end if;

  -- One pick per pair, immutable. Leave is silent — it never matches.
  insert into public.l3_picks (picker_id, target_id, choice)
  values (v_user, p_target, p_choice)
  on conflict (picker_id, target_id) do nothing;

  if p_choice = 'leave' then
    return query select null::uuid, null::text;
    return;
  end if;

  -- Did they pick me back with a real signal?
  select choice into v_theirs
  from public.l3_picks
  where picker_id = p_target and target_id = v_user;

  if v_theirs in ('like', 'love') then
    -- Tier: both love = T2 super match; anything else mutual = T1.
    v_tier := case
      when v_theirs = 'love' and p_choice = 'love' then 't2'
      else 't1'
    end;

    insert into public.matches (user_id_a, user_id_b, source, tier)
    values (least(v_user, p_target), greatest(v_user, p_target), 'l3', v_tier)
    on conflict (user_id_a, user_id_b) do update
    -- A later higher tier upgrades a lower one; browse matches get tiered too.
    set tier = case
      when public.matches.tier = 't2' or excluded.tier = 't2' then 't2'
      else 't1'
    end
    returning id into v_match;

    -- The free line — 5 messages each, scoped to this match.
    insert into public.l3_rewards (match_id, user_id, messages_left)
    values (v_match, v_user, 5), (v_match, p_target, 5)
    on conflict on constraint l3_rewards_match_id_user_id_key do nothing;

    -- T2: the super match pops the cork — a floor-tiered gift for each.
    if v_tier = 't2' then
      for v_user in select u from (values (v_user), (p_target)) as t(u)
      loop
        v_floor := case public.current_tier(v_user)
          when 'gold' then 'gold'
          when 'platinum' then 'platinum'
          when 'diamond' then 'diamond'
          else 'silver'
        end;
        select id into v_cat
        from public.gift_catalog
        where floor = v_floor and kind = 'special' and active
        order by token_cost
        limit 1;
        if v_cat is not null then
          insert into public.gift_inventory (user_id, catalog_id, status)
          values (v_user, v_cat, 'available');
        end if;
      end loop;

      -- Wins are announced (silent loss, public win).
      insert into public.club_announcements (body, kind)
      values ('💘 A super match just happened at Club Cheeky!', 'gift');
    end if;
  end if;

  return query select v_match, v_tier;
end;
$$;

grant execute on function public.create_l3_pick(uuid, text) to authenticated;
