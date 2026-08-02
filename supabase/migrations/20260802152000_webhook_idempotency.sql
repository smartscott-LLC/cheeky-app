-- Create webhook events table to record processed Stripe events for idempotency

create table public.webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);

-- Enable RLS and prevent client-side writes/reads; service role (server) bypasses RLS.
alter table public.webhook_events enable row level security;

create policy "No client select" on public.webhook_events for select using (false);
create policy "No client insert" on public.webhook_events for insert using (false);
create policy "No client update" on public.webhook_events for update using (false);
create policy "No client delete" on public.webhook_events for delete using (false);
