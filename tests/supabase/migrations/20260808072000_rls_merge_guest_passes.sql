-- RLS consolidation (2026-08-08): guest_passes had two permissive SELECT
-- policies ("Guest reads passes they hold" + "Host reads passes they sent")
-- for the same role set — permissive policies OR-compose, so Postgres
-- evaluates both predicates per row. Merged into one policy with the OR in
-- a single predicate; semantics are identical (permissive OR), one pass
-- instead of two. Found via Supabase's security advisor.

drop policy if exists "Guest reads passes they hold" on public.guest_passes;
drop policy if exists "Host reads passes they sent" on public.guest_passes;

create policy "Passes are visible to the guest who holds them or the host who sent them"
  on public.guest_passes
  as permissive
  for select
  using (
    (guest_id = (select auth.uid()))
    or (host_id = (select auth.uid()))
  );
