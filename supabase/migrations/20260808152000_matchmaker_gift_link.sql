-- Link each declined unlock to the consolation gift awarded, so the sender's
-- Matchmaker history can show exactly which collectible they earned (the
-- rebound prize). matchmaker_award_gift now returns the inventory id; the
-- decline path stores it on the unlock row.

alter table public.matchmaker_unlocks
  add column if not exists gift_inventory_id uuid
  references public.gift_inventory(id) on delete set null;

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

create or replace function public.matchmaker_respond_unlock(p_unlock_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_unlock public.matchmaker_unlocks%rowtype;
  v_conv uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_unlock
  from public.matchmaker_unlocks
  where id = p_unlock_id and recipient_id = v_user and status = 'sent'
  for update;
  if v_unlock.id is null then
    raise exception 'unlock_not_found';
  end if;

  if p_accept then
    v_conv := public.get_or_create_conversation(v_unlock.sender_id);

    insert into public.messages (conversation_id, sender_id, body)
    values (v_conv, v_unlock.sender_id, v_unlock.message);

    -- Acceptance is consent: the pair is now a real match, so the thread
    -- flows through the normal messaging stack (both can talk; the unlock
    -- message already lives in the conversation for retention-purge).
    insert into public.matches (user_id_a, user_id_b, source)
    values (least(v_user, v_unlock.sender_id), greatest(v_user, v_unlock.sender_id), 'matchmaker')
    on conflict (user_id_a, user_id_b) do nothing;

    -- The collectible pull: accepting from another floor earns its variant.
    perform public.matchmaker_award_gift(v_user, v_unlock.sender_floor);

    update public.matchmaker_unlocks
    set status = 'accepted', conversation_id = v_conv, responded_at = now()
    where id = p_unlock_id;
  else
    -- Silent end for the recipient; the sender gets the consolation gift —
    -- "they declined, but you still won the game" (the rebound, PRD §6).
    update public.matchmaker_unlocks
    set status = 'declined', responded_at = now(),
        gift_inventory_id = public.matchmaker_award_gift(v_unlock.sender_id, v_unlock.sender_floor)
    where id = p_unlock_id;
  end if;
end;
$$;

grant execute on function public.matchmaker_respond_unlock(uuid, boolean) to authenticated;
