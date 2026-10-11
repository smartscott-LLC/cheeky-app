-- Resolve taskbar_state overload ambiguity (owner-review 2026-10-11, HUD tier bug).
--
-- A 1-arg variant taskbar_state(p_user uuid) exists on the hosted DB that is
-- NOT in any committed migration (ad-hoc drift, likely from tooling).
-- PostgREST refuses to disambiguate the name even for the zero-arg call
-- (PGRST203), so every /api/taskbar request errored, the route's `?? 'silver'`
-- fallback masked it, and every member's HUD showed Silver regardless of
-- actual tier (e.g. Diamond).
--
-- Fix: drop the unowned overload. The canonical zero-arg function (created by
-- 20260914000007_event_free_allowances.sql) is untouched. Grants are re-applied
-- idempotently to match the post-upgrade invariant (anon must never EXECUTE).

drop function if exists public.taskbar_state(p_user uuid);

grant execute on function public.taskbar_state() to authenticated, service_role;
revoke execute on function public.taskbar_state() from anon;
