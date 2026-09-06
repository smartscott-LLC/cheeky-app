-- The Gift Store (Phase 5 anchor): catalog, inventory, sends, the 2-hour
-- date room, and the anonymous overhead ticker. All writes via
-- security-definer RPCs; tokens are a server-side ledger debit at purchase.
--
-- Locked rules (PRD-phase5-wing.md §3):
--  - Buy down, never up (you may buy gifts from your floor and below).
--  - Debit at purchase; the gift lives in your inventory.
--  - Send: 1 offer/hour, GLOBAL across all gifts.
--  - Denied -> back to inventory (no refund, no item loss); accepted -> gone.
--  - Announcement: anonymous to the club, in-app only, send-only (never the
--    outcome). The recipient sees the sender privately, with photo.
--  - Accept -> 2-hour guest pass to the gift's floor (basket = sender's
--    floor) + a decorated date room.

-- ============================================================
-- GIFT CATALOG
-- ============================================================
create table public.gift_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  emoji text not null,
  floor text not null check (floor in ('silver', 'gold', 'platinum', 'diamond')),
  token_cost int not null check (token_cost > 0),
  kind text not null default 'special' check (kind in ('special', 'basket')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.gift_catalog (slug, name, emoji, floor, token_cost, kind) values
  ('teddy', 'Stuffed Bear', '🧸', 'silver', 25, 'special'),
  ('golden_roses', 'Golden Bouquet', '🌹', 'gold', 50, 'special'),
  ('jewelry', 'Jewelry', '🔷', 'platinum', 100, 'special'),
  ('champagne', 'Bottle of Champagne', '🍾', 'diamond', 200, 'special'),
  ('gift_basket', 'The Gift Basket', '🧺', 'silver', 300, 'basket')
on conflict (slug) do nothing;

alter table public.gift_catalog enable row level security;
create policy "Gift catalog is public"
  on public.gift_catalog for select using (true);

-- ============================================================
-- GIFT INVENTORY (instances the member owns)
-- ============================================================
create table public.gift_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  catalog_id uuid references public.gift_catalog(id) not null,
  status text not null default 'available'
    check (status in ('available', 'sent', 'accepted')),
  created_at timestamptz not null default now()
);

alter table public.gift_inventory enable row level security;
create policy "Read your inventory"
  on public.gift_inventory for select using (user_id = auth.uid());

-- ============================================================
-- GIFT SENDS (the offer + outcome, private to the two parties)
-- ============================================================
create table public.gift_sends (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references public.gift_inventory(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  catalog_id uuid references public.gift_catalog(id) not null,
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'denied')),
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (inventory_id)
);

alter table public.gift_sends enable row level security;
create policy "Gift sends are private to the two parties"
  on public.gift_sends for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- ============================================================
-- DATE ROOMS (the 2-hour decorated room on accept)
-- ============================================================
create table public.date_rooms (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references auth.users(id) on delete cascade not null,
  user_b uuid references auth.users(id) on delete cascade not null,
  source text not null default 'gift',
  floor text not null default 'silver',
  expires_at timestamptz not null,
  gift_send_id uuid references public.gift_sends(id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.date_rooms enable row level security;
create policy "Date rooms are visible to the pair"
  on public.date_rooms for select
  using (user_a = auth.uid() or user_b = auth.uid());

-- ============================================================
-- CLUB ANNOUNCEMENTS (the anonymous overhead ticker, in-app only)
-- ============================================================
create table public.club_announcements (
  id bigint generated always as identity primary key,
  body text not null,
  kind text not null default 'gift',
  created_at timestamptz not null default now()
);

alter table public.club_announcements enable row level security;
create policy "Announcements are public"
  on public.club_announcements for select using (true);

-- ============================================================
-- BUY_GIFT — floor-gated purchase, ledger debit, to inventory
-- ============================================================
create or replace function public.buy_gift(p_slug text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_floor text;
  v_balance int;
  v_holds int;
  v_inv uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select token_cost, floor into v_cost, v_floor
  from public.gift_catalog
  where slug = p_slug and active;
  if v_cost is null then
    raise exception 'gift_not_found';
  end if;

  -- Buy down, never up: your tier must reach the gift's floor.
  if public.tier_rank(public.current_tier(v_user)) < public.tier_rank(v_floor) then
    raise exception 'tier_required';
  end if;

  -- Available = ledger balance - active event holds.
  select coalesce(sum(delta), 0) into v_balance
  from public.token_ledger
  where user_id = v_user;

  select coalesce(sum(e.token_cost), 0) into v_holds
  from public.event_entries ee
  join public.events e on e.id = ee.event_id
  where ee.user_id = v_user and ee.status = 'reserved';

  if v_balance - v_holds < v_cost then
    raise exception 'insufficient_tokens';
  end if;

  insert into public.token_ledger (user_id, delta, reason, ref)
  values (v_user, -v_cost, 'gift_purchase', null);

  insert into public.gift_inventory (user_id, catalog_id, status)
  values (v_user, (select id from public.gift_catalog where slug = p_slug), 'available')
  returning id into v_inv;

  return v_inv;
end;
$$;

grant execute on function public.buy_gift(text) to authenticated;

-- ============================================================
-- SEND_GIFT — 1 offer/hour global, block-aware, anonymous ticker
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
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_recipient is null or p_recipient = v_user then
    raise exception 'invalid_recipient';
  end if;

  -- The gift must be yours and unsent.
  select catalog_id into v_catalog_id
  from public.gift_inventory
  where id = p_gift_id and user_id = v_user and status = 'available';
  if v_catalog_id is null then
    raise exception 'gift_not_available';
  end if;

  -- Recipient must be a real member.
  if not exists (select 1 from public.profiles where id = p_recipient) then
    raise exception 'invalid_recipient';
  end if;

  -- Blocks, both directions.
  if exists (
    select 1 from public.blocks
    where (blocker_id = v_user and blocked_id = p_recipient)
       or (blocker_id = p_recipient and blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;

  -- One offer per hour, global across all gifts.
  if exists (
    select 1 from public.gift_sends
    where sender_id = v_user and sent_at > now() - interval '1 hour'
  ) then
    raise exception 'send_cooldown';
  end if;

  select name, emoji into v_catalog_name, v_catalog_emoji
  from public.gift_catalog where id = v_catalog_id;

  update public.gift_inventory
  set status = 'sent'
  where id = p_gift_id;

  insert into public.gift_sends (inventory_id, sender_id, recipient_id, catalog_id, status)
  values (p_gift_id, v_user, p_recipient, v_catalog_id, 'sent');

  -- The overhead ticker: anonymous, send-only, never the outcome.
  insert into public.club_announcements (body, kind)
  values (v_catalog_emoji || ' Someone just sent a ' || v_catalog_name || '!', 'gift');
end;
$$;

grant execute on function public.send_gift(uuid, uuid) to authenticated;

-- ============================================================
-- RESPOND_GIFT — accept (pass + date room) or deny (silent return)
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
    -- Pass tier: the gift's floor; the basket passes the sender's floor.
    v_pass_tier := case
      when v_catalog_kind = 'basket' then public.current_tier(v_sender)
      else v_catalog_floor
    end;

    if v_pass_tier in ('gold', 'platinum', 'diamond') then
      insert into public.guest_passes (host_id, guest_id, tier, expires_at)
      values (v_sender, v_user, v_pass_tier, now() + interval '2 hours');
    end if;

    -- The room: a real conversation between them.
    v_conv := public.get_or_create_conversation(v_sender);

    v_pair_a := least(v_user, v_sender);
    v_pair_b := greatest(v_user, v_sender);

    insert into public.date_rooms (user_a, user_b, source, floor, expires_at, gift_send_id)
    values (v_pair_a, v_pair_b, 'gift', v_pass_tier, now() + interval '2 hours', p_send_id)
    on conflict (user_a, user_b) do update
    set source = 'gift',
        floor = v_pass_tier,
        expires_at = now() + interval '2 hours',
        gift_send_id = p_send_id;

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
