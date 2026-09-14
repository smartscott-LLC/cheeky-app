-- FIX: gift send cooldown — change from 1-hour to 15-minute window.
-- Affects: send_gift RPC (featured/basket), which powers the gift shop send flow.

create or replace function public.send_gift(p_gift_id uuid, p_recipient uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_catalog_id uuid;
  v_catalog_name text;
  v_catalog_emoji text;
  v_catalog_kind text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_recipient is null or p_recipient = v_user then
    raise exception 'invalid_recipient';
  end if;

  select catalog_id into v_catalog_id
  from public.gift_inventory
  where id = p_gift_id and user_id = v_user and status = 'available';
  if v_catalog_id is null then
    raise exception 'gift_not_available';
  end if;

  if not exists (select 1 from public.profiles where id = p_recipient) then
    raise exception 'invalid_recipient';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_user and blocked_id = p_recipient)
       or (blocker_id = p_recipient and blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;

  -- 15-minute cooldown (was 1 hour).
  if exists (
    select 1 from public.gift_sends
    where sender_id = v_user and sent_at > now() - interval '15 minutes'
  ) then
    raise exception 'send_cooldown';
  end if;

  select name, emoji, kind into v_catalog_name, v_catalog_emoji, v_catalog_kind
  from public.gift_catalog where id = v_catalog_id;

  update public.gift_inventory
  set status = 'sent'
  where id = p_gift_id;

  insert into public.gift_sends (inventory_id, sender_id, recipient_id, catalog_id, status)
  values (p_gift_id, v_user, p_recipient, v_catalog_id, 'sent');

  -- Ticker: only featured gifts and the basket announce.
  if v_catalog_kind <> 'mini' then
    insert into public.club_announcements (body, kind)
    values (v_catalog_emoji || ' Someone just sent a ' || v_catalog_name || '!', 'gift');
  end if;
end;
$$;

grant execute on function public.send_gift(uuid, uuid) to authenticated;
