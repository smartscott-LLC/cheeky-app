-- Token-engine hardening (audit #7 test prep): join_event now takes a
-- per-user transaction advisory lock so a member's balance + active-holds
-- check can never race. Without it, two concurrent joins by the same member
-- to different events could both read holds=0 and over-commit their tokens.
-- Different members hash to different locks, so throughput at scale is
-- unaffected — the "thousand members joining one event" case stays parallel.

create or replace function public.join_event(p_event_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_balance int;
  v_holds int;
  v_entry uuid;
  v_event_status text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Serialize this member's joins: the balance/holds read below must not
  -- interleave with another join by the same member.
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select status, token_cost into v_event_status, v_cost
  from public.events
  where id = p_event_id;

  if v_event_status is null then
    raise exception 'event_not_found';
  end if;
  if v_event_status <> 'open' then
    raise exception 'event_not_open';
  end if;

  if exists (
    select 1 from public.event_entries
    where event_id = p_event_id and user_id = v_user
  ) then
    raise exception 'already_joined';
  end if;

  -- Available = ledger balance - active holds.
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

  insert into public.event_entries (event_id, user_id, status)
  values (p_event_id, v_user, 'reserved')
  returning id into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.join_event(uuid) to authenticated;
