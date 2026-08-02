-- Security-definer function to safely add token ledger entries server-side
-- Ensures idempotent verification bonus handling and centralizes validation/audit.

create or replace function public.add_token_delta(
  p_user uuid,
  p_delta integer,
  p_reason text,
  p_ref uuid
) returns bigint as $$
declare
  existing_id bigint;
  new_id bigint;
begin
  -- For idempotent reasons like 'verification_bonus' we avoid duplicate grants by reason
  if exists (select 1 from public.token_ledger where user_id = p_user and reason = p_reason) then
    return null;
  end if;

  insert into public.token_ledger (user_id, delta, reason, ref)
  values (p_user, p_delta, p_reason, p_ref)
  returning id into new_id;

  return new_id;
end;
$$ language plpgsql security definer;

-- Restrict accidental public execution; only server/service-role should call this.
revoke all on function public.add_token_delta(uuid, integer, text, uuid) from public;
