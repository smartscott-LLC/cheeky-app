-- Blind Date: only females can host. Males can still join as suitors.
-- Alters the create_blind_date RPC to reject non-female hosts.

create or replace function public.create_blind_date()
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event uuid;
  v_gender text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if public.tier_rank(public.current_tier(v_user)) < 1 then
    raise exception 'floor_required'; -- Gold and up
  end if;
  if exists (
    select 1 from public.events
    where host_id = v_user and kind = 'blind_date' and status in ('open', 'running')
  ) then
    raise exception 'room_active';
  end if;

  -- Only females may host blind date. Males may still join as suitors.
  select gender into v_gender from public.profiles where id = v_user limit 1;
  if v_gender <> 'female' then
    raise exception 'host_gender_required';
  end if;

  -- 10 minutes to fill (min 3 suitors), then the minute hand starts it.
  insert into public.events (kind, floor, starts_at, status, token_cost, min_fill, host_id)
  values ('blind_date', 'gold', now() + interval '10 minutes', 'open', 15, 3, v_user)
  returning id into v_event;
  return v_event;
end;
$$;
