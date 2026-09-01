-- Review updates (from first-floor flow review):
-- 1) Verification retry limit — 3 failed checks escalate to human support.
-- 2) Moderation outcomes on reports — action_taken / suspended / no_action.

alter table public.profile_private
  add column verification_attempts int not null default 0,
  add column verification_escalated_at timestamptz;

alter table public.reports
  add column status text not null default 'pending',
  add column outcome text,
  add column resolved_at timestamptz,
  add constraint reports_status_check
    check (status in ('pending', 'reviewed')),
  add constraint reports_outcome_check
    check (outcome is null or outcome in ('action_taken', 'suspended', 'no_action'));
