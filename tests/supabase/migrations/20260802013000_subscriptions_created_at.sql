-- The engine's tier functions (current_tier, message limits, event gating)
-- order active subscriptions by s.created_at, but the starter-template
-- subscriptions table only shipped a `created` column. Add the column the
-- engine expects so tier resolution works for users without grants/passes.
alter table public.subscriptions
  add column created_at timestamptz not null default now();
