-- The Gift Store, expanded: two tiers per floor.
--   featured (kind 'featured') — announces on the ticker; accept = 2-hour
--     pass to the floor + a decorated date room. (The original floor gifts.)
--   mini (kind 'mini') — silent, affordable; a gesture that shows interest
--     without the big commitment. Accept opens the chat, nothing else.
--   basket — unchanged, available on every floor.

-- Widen the kind check: 'featured' and 'mini' join 'basket'. Order matters:
-- drop (if exists — a prior partial run may have left it dropped), relabel,
-- insert minis, then re-add the widened check over valid data.
alter table public.gift_catalog drop constraint if exists gift_catalog_kind_check;

update public.gift_catalog
set kind = 'featured'
where kind = 'special';

-- The mini shelf: four per floor, priced under that floor's featured gift.
insert into public.gift_catalog (slug, name, emoji, floor, token_cost, kind) values
  ('rubber_duck',    'Rubber Duck',      '🦆', 'silver',   10,  'mini'),
  ('candy_hearts',   'Candy Hearts',     '🍭', 'silver',   12,  'mini'),
  ('plush_bunny',    'Plush Bunny',      '🐰', 'silver',   15,  'mini'),
  ('mini_bear',      'Mini Bear',        '🐻', 'silver',   20,  'mini'),
  ('golden_dice',    'Golden Dice',      '🎲', 'gold',     25,  'mini'),
  ('gold_bar',       'Gold Bar',         '🍫', 'gold',     30,  'mini'),
  ('gold_shades',    'Gold Shades',      '🕶️', 'gold',     35,  'mini'),
  ('gold_pen',       'Gold Pen',         '✒️', 'gold',     40,  'mini'),
  ('metal_pen',      'Metal Pen',        '🖊️', 'platinum', 45,  'mini'),
  ('platinum_keychain', 'Platinum Keychain', '🔑', 'platinum', 55, 'mini'),
  ('velvet_bow_tie', 'Velvet Bow Tie',   '🎩', 'platinum', 65,  'mini'),
  ('pocket_flask',   'Pocket Flask',     '🥃', 'platinum', 75,  'mini'),
  ('diamond_shades', 'Diamond Shades',   '👓', 'diamond',  80,  'mini'),
  ('fountain_pen',   'Fountain Pen',     '🖋️', 'diamond', 100,  'mini'),
  ('top_hat',        'Top Hat',          '🎩', 'diamond', 120,  'mini'),
  ('crystal_heart',  'Crystal Heart',    '💎', 'diamond', 150,  'mini')
on conflict (slug) do nothing;

alter table public.gift_catalog add constraint gift_catalog_kind_check
  check (kind in ('featured', 'mini', 'basket'));

-- ============================================================
-- SEND_GIFT: only featured + basket hit the overhead ticker.
-- Minis are silent gestures.
-- ============================================================
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

  if exists (
    select 1 from public.gift_sends
    where sender_id = v_user and sent_at > now() - interval '1 hour'
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

  -- The overhead ticker: only featured gifts and the basket announce.
  if v_catalog_kind <> 'mini' then
    insert into public.club_announcements (body, kind)
    values (v_catalog_emoji || ' Someone just sent a ' || v_catalog_name || '!', 'gift');
  end if;
end;
$$;

grant execute on function public.send_gift(uuid, uuid) to authenticated;

-- ============================================================
-- RESPOND_GIFT: featured/basket accept = pass + date room (always
-- opens the chat). Mini accept = just the chat. Deny = silent return.
-- ============================================================
create or replace function public.respond_gift(p_send_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_inventory_id uuid;
  v_sender uuid;
  v_catalog_floor text;
  v_catalog_kind text;
  v_pass_tier text;
  v_conv uuid;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select inventory_id, sender_id into v_inventory_id, v_sender
  from public.gift_sends
  where id = p_send_id and recipient_id = v_user and status = 'sent';
  if v_inventory_id is null then
    raise exception 'send_not_found';
  end if;

  select c.floor, c.kind into v_catalog_floor, v_catalog_kind
  from public.gift_catalog c
  join public.gift_sends gs on gs.catalog_id = c.id
  where gs.id = p_send_id;

  if p_accept then
    -- Minis are a gesture: the chat opens, nothing else. Featured gifts
    -- and the basket unlock the pass + the decorated date room.
    if v_catalog_kind <> 'mini' then
      v_pass_tier := case
        when v_catalog_kind = 'basket' then public.current_tier(v_sender)
        else v_catalog_floor
      end;

      if v_pass_tier in ('gold', 'platinum', 'diamond') then
        insert into public.guest_passes (host_id, guest_id, tier, expires_at)
        values (v_sender, v_user, v_pass_tier, now() + interval '2 hours');
      end if;

      v_pair_a := least(v_user, v_sender);
      v_pair_b := greatest(v_user, v_sender);

      insert into public.date_rooms (user_a, user_b, source, floor, expires_at, gift_send_id)
      values (v_pair_a, v_pair_b, 'gift', v_pass_tier, now() + interval '2 hours', p_send_id)
      on conflict (user_a, user_b) do update
      set source = 'gift',
          floor = v_pass_tier,
          expires_at = now() + interval '2 hours',
          gift_send_id = p_send_id;
    end if;

    -- The room: a real conversation between them.
    v_conv := public.get_or_create_conversation(v_sender);

    update public.gift_inventory
    set status = 'accepted'
    where id = v_inventory_id;
  else
    -- Silent return: the gift goes back to the sender's stash.
    update public.gift_inventory
    set status = 'available'
    where id = v_inventory_id;
  end if;

  update public.gift_sends
  set status = case when p_accept then 'accepted' else 'denied' end,
      responded_at = now()
  where id = p_send_id;
end;
$$;

grant execute on function public.respond_gift(uuid, boolean) to authenticated;
