-- Fix the test-member visibility policy (2026-08-08): the policy's inner
-- check read public.profiles inside the policy on public.profiles →
-- "infinite recursion detected in policy for relation profiles" → EVERY
-- profile read errored (every member bounced out of the club — the founder
-- hit it first at the velvet rope). The self-check now runs through a
-- security-definer helper, which bypasses RLS (no recursive policy pass),
-- exactly like l3_trio's guard.

create or replace function public.is_test_member()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and test_member
  );
$$;

drop policy if exists "Profiles are readable by everyone" on public.profiles;

create policy "Profiles are readable by everyone"
  on public.profiles for select using (
    not test_member or public.is_test_member()
  );
