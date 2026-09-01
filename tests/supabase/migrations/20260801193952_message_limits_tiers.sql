-- Messaging limits (review update): generous daily message caps by tier +
-- caps on NEW people you can reach. Matches are always reachable.
--
--   Tier        Messages/day   New people/day
--   Free/Silver 30             5
--   Gold        75             15
--   Platinum    unlimited      40
--   Diamond     unlimited      100
--
-- Event chats (Dance Floor song) do NOT count against these — they are
-- paid for with tokens and travel their own path (Phase 2).
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

  -- Sender's tier from their active subscription (none = Silver/free).
  select coalesce(p.name, 'Standard Membership') into v_tier
  from public.subscriptions s
  join public.prices pr on pr.id = s.price_id
  join public.products p on p.id = pr.product_id
  where s.user_id = v_sender
    and s.status in ('active', 'trialing')
  order by s.created_at desc
  limit 1;

  v_msg_limit := case v_tier
    when 'Gold Membership' then 75
    else 30
  end;
  v_people_limit := case v_tier
    when 'Gold Membership' then 15
    when 'Platinum Membership' then 40
    when 'Diamond Club' then 100
    else 5
  end;

  -- Daily message cap (all conversations, matched or not — generous on purpose).
  select count(*) into v_msg_today
  from public.messages m
  where m.sender_id = v_sender
    and m.created_at >= date_trunc('day', now());

  if v_msg_today >= v_msg_limit then
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
      and m.created_at >= date_trunc('day', now())
      and not exists (
        select 1 from public.matches mt
        where mt.user_id_a =
                least(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
          and mt.user_id_b =
                greatest(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
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
