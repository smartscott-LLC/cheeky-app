-- FIX: send_message — Platinum and Diamond get unlimited messages (∞).
-- Previously they fell through to the 'else' branch = 30/day (same as Silver).
-- Also fixes people limits: Silver=5 (via else), Gold=15, Platinum=40, Diamond=100.

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_other uuid;
  v_tier text;
  v_msg_limit int;
  v_people_limit int;
  v_msg_today int;
  v_people_today int;
  v_matched boolean;
  v_msg bigint;
  v_cst_midnight timestamptz;
begin
  if v_sender is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then
    raise exception 'invalid_message_length';
  end if;

  select case when user_id_a = v_sender then user_id_b else user_id_a end
    into v_other
  from public.conversations
  where id = p_conversation_id;

  if v_other is null then
    raise exception 'not_a_participant';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_sender and blocked_id = v_other)
       or (blocker_id = v_other and blocked_id = v_sender)
  ) then
    raise exception 'blocked';
  end if;

  v_cst_midnight := (now() AT TIME ZONE 'America/Chicago')::date::timestamptz AT TIME ZONE 'UTC';

  select coalesce(p.name, 'Standard Membership') into v_tier
  from public.subscriptions s
  join public.prices pr on pr.id = s.price_id
  join public.products p on p.id = pr.product_id
  where s.user_id = v_sender
    and s.status in ('active', 'trialing')
  order by s.created_at desc
  limit 1;

  -- Unlimited messages for Platinum and Diamond; cap at tier level otherwise.
  v_msg_limit := case v_tier
    when 'Gold Membership' then 75
    when 'Platinum Membership' then null
    when 'Diamond Club' then null
    else 30
  end;

  -- New people cap by tier.
  v_people_limit := case v_tier
    when 'Gold Membership' then 15
    when 'Platinum Membership' then 40
    when 'Diamond Club' then 100
    else 5
  end;

  -- Daily message cap (midnight CST reset).
  select count(*) into v_msg_today
  from public.messages m
  where m.sender_id = v_sender
    and m.created_at >= v_cst_midnight;

  if v_msg_limit is not null and v_msg_today >= v_msg_limit then
    raise exception 'daily_message_limit';
  end if;

  -- Matches are always reachable (unlimited new-people spend on matches).
  select exists (
    select 1 from public.matches
    where user_id_a = least(v_sender, v_other)
      and user_id_b = greatest(v_sender, v_other)
      and status = 'active'
  ) into v_matched;

  -- New-people cap: distinct non-matched recipients messaged today.
  if not v_matched then
    select count(distinct
        case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
      into v_people_today
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.sender_id = v_sender
      and m.created_at >= v_cst_midnight
      and not exists (
        select 1 from public.matches mt
        where mt.user_id_a = least(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
          and mt.user_id_b = greatest(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
      );

    if v_people_today >= v_people_limit then
      raise exception 'daily_people_limit';
    end if;
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_sender, p_body)
  returning id into v_msg;

  return v_msg;
end;
$$;

grant execute on function public.send_message(uuid, text) to authenticated;
