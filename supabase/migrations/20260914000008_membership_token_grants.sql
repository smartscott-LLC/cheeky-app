-- FIX: Membership token grants on subscription creation.
-- Gold = 50 tokens, Platinum = 150 tokens, Diamond = 500 tokens.
-- Grant tokens only once on first purchase (tracked via grant_timestamp in subscriptions).
-- Tokens DO NOT roll over for membership grants (only store purchases roll over).

create or replace function public.on_subscription_activate()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_tier text;
  v_grant int;
  v_sub_id uuid;
begin
  -- Only fire on new subscriptions (not updates)
  if tg_op != 'INSERT' then
    return new;
  end if;

  v_sub_id := new.id;

  -- Determine grant amount based on product name
  select p.name into v_tier
  from public.prices pr
  join public.products p on p.id = pr.product_id
  where pr.id = new.price_id;

  v_grant := case v_tier
    when 'Gold Membership' then 50
    when 'Platinum Membership' then 150
    when 'Diamond Club' then 500
    else 0
  end;

  if v_grant > 0 then
    insert into public.token_ledger (user_id, delta, reason, ref)
    values (new.user_id, v_grant, 'membership_grant', v_sub_id::text);

    -- Mark subscription so we don't double-grant on re-subscribe
    update public.subscriptions
    set grant_timestamp = now()
    where id = v_sub_id;
  end if;

  return new;
end;
$$;

-- Drop existing trigger if present (idempotent)
drop trigger if exists on_subscription_activate_trigger on public.subscriptions;

-- Create the trigger
create trigger on_subscription_activate_trigger
  after insert on public.subscriptions
  for each row execute function public.on_subscription_activate();
