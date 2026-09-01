-- The banned-account registry (2026-08-04): expelled members land here and
-- the door consults it at signup and sign-in, so a ban can't be walked
-- around with a fresh email. Retention follows the ban (default 5 years;
-- null banned_until = lifetime). Emails are stored lowercase.
create table public.banned_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  banned_until timestamptz,
  evidence text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.banned_accounts enable row level security;
-- No client policies: the registry is consulted server-side (service role)
-- at signup/sign-in and written only from the Lions Den.
