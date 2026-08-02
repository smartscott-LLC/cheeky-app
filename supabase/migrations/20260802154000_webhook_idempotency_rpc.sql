-- Atomic idempotency function for webhook events

-- Creates a SECURITY DEFINER function that attempts to insert the event
-- and returns true if the insert succeeded (first time) or false if it
-- already existed.

create or replace function public.mark_webhook_processed(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
) returns boolean as $$
begin
  insert into public.webhook_events(event_id, event_type, payload)
  values (p_event_id, p_event_type, p_payload)
  on conflict (event_id) do nothing;

  if found then
    return true;
  else
    return false;
  end if;
end;
$$ language plpgsql security definer
set search_path = public;

-- Grant execute to the authenticated/owner role is not necessary for
-- server-side service role usage, but prevents accidental client calls.

REVOKE ALL ON FUNCTION public.mark_webhook_processed(text, text, jsonb) FROM public;
