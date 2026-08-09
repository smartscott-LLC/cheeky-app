-- Cosmetic: the merged guest_passes policy name exceeded Postgres's 63-char
-- identifier limit and got truncated mid-word. Clean short name, same body.

drop policy if exists "Passes are visible to the guest who holds them or the host who " on public.guest_passes;

create policy "Passes visible to holder or host"
  on public.guest_passes
  as permissive
  for select
  using (
    (guest_id = (select auth.uid()))
    or (host_id = (select auth.uid()))
  );
