-- Consistency pass for the RLS perf fix (2026-08-08): the profiles SELECT
-- policy calls public.is_test_member() directly, which the generator didn't
-- touch (it only wrapped auth/current_setting calls). The function is
-- STABLE — the planner may re-evaluate it per row. Same pattern as the
-- 49-policy pass: wrap the call in a scalar subquery so it computes once
-- per statement.

drop policy if exists "Profiles are readable by everyone" on public.profiles;

create policy "Profiles are readable by everyone"
  on public.profiles for select using (
    not test_member or (select public.is_test_member())
  );
