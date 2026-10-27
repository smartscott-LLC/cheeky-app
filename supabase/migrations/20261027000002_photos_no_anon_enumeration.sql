-- Security audit 2026-10-27: "Photos are readable by everyone" was granted to
-- PUBLIC (all roles INCLUDING anon), letting an unauthenticated caller list
-- every member's storage path (which embeds their user id). No app surface
-- reads the photos table while signed out — every viewer (browse, cards,
-- coat check, lounge) is authenticated. The public BUCKET stays as designed
-- (a photo at a known URL is viewable — dating-app doctrine); this closes the
-- ENUMERATION hole only: anon can no longer walk the catalog.

drop policy if exists "Photos are readable by everyone" on public.photos;

create policy "Photos are readable by signed-in members"
  on public.photos
  for select
  to authenticated
  using (true);
