-- Test-member visibility guard at the RLS layer (2026-08-08).
-- profiles had a single SELECT policy of `using (true)` — the seeded dummy
-- members would have been visible to EVERY real member in browse, chat
-- lists, and anywhere else profiles are read (only l3_trio was guarded).
-- Now the guard lives in the policy, matching l3_trio's rule: test members
-- are visible only to callers who are themselves test-flagged. Real members
-- never see a fake face (no fake activity, per the mission guardrails).

drop policy if exists "Profiles are readable by everyone" on public.profiles;

create policy "Profiles are readable by everyone"
  on public.profiles for select using (
    not test_member
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.test_member
    )
  );
