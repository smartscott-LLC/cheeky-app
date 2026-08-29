-- The Cheeky Lounge — privacy toggles (2026-08-08, founder): members can
-- switch off whether they'll accept private invites and gifts, so a busy
-- member can't get spammed with either. Default on — nothing changes until
-- someone opts out. The sending side gets a clear refusal.

alter table public.profiles
  add column if not exists accepts_private_invites boolean not null default true,
  add column if not exists accepts_gifts boolean not null default true;

-- send_gift: refuse when the recipient has gifts switched off.
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

  if not exists (
    select 1 from public.profiles where id = p_recipient and accepts_gifts
  ) then
    raise exception 'gifts_disabled';
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

-- club_chat_invite: refuse when the invitee has private invites switched off.
create or replace function public.club_chat_invite(p_user uuid)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_invite uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_user = p_user then
    raise exception 'cannot_invite_self';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_user and verified_at is not null
  ) then
    raise exception 'invalid_target';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_user and accepts_private_invites
  ) then
    raise exception 'invites_disabled';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_user and b.blocked_id = p_user)
       or (b.blocker_id = p_user and b.blocked_id = v_user)
  ) then
    raise exception 'blocked';
  end if;
  -- Already matched? No invite needed — just open the conversation.
  if exists (
    select 1 from public.matches
    where user_id_a = least(v_user, p_user)
      and user_id_b = greatest(v_user, p_user)
      and status = 'active'
  ) then
    raise exception 'already_matched';
  end if;

  insert into public.club_chat_invites (inviter_id, invitee_id)
  values (v_user, p_user)
  on conflict (inviter_id, invitee_id) do nothing
  returning id into v_invite;

  if v_invite is null then
    select id into v_invite
    from public.club_chat_invites
    where inviter_id = v_user and invitee_id = p_user;
  end if;

  return v_invite;
end;
$$;

grant execute on function public.club_chat_invite(uuid) to authenticated;
