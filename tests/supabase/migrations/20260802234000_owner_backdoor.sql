-- The Owner's Back Door — the Booth unlocks on the founder's own account
-- (no key to lose). Server-side check only; no client policies. The
-- ADMIN_KEY env remains as a fallback path.
create table public.owner_accounts (
  user_id uuid references auth.users(id) on delete cascade not null primary key,
  created_at timestamptz not null default now()
);

alter table public.owner_accounts enable row level security;
-- No client policies: the check happens in server actions via service role.

-- Seed the founder's account (hosted only — local dev has no such user, so
-- this is a no-op there). Matches the "Boss" handle he took on launch day.
insert into public.owner_accounts (user_id)
select p.id
from public.profiles p
where p.display_name ilike 'boss'
on conflict (user_id) do nothing;
