-- Add missing status column to subscriptions table.
-- The RPC layer (current_tier, etc.) references s.status but it was
-- never added — the hosted DB got the table from an earlier seed but
-- skipped the enum column.
--
-- subscription_status enum already exists in the hosted DB (from an
-- earlier partial setup), so we only need the column.

alter table public.subscriptions
  add column if not exists status subscription_status;

-- Backfill existing subscriptions to 'active' so current_tier resolves
-- for paid members who subscribed before this migration.
update public.subscriptions
  set status = 'active'
  where status is null and id is not null;