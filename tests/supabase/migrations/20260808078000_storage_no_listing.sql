-- Close the storage listing hole (2026-08-08, Supabase lint 0025): the
-- profiles bucket is public (good — direct object URLs serve photos), but
-- the "Read profile photos" SELECT policy let ANYONE list every object key
-- in the bucket — enumerating all user photo paths and inferring activity.
-- Public URLs don't need SELECT policies; the app builds URLs from known
-- storage_paths in the photos table. Option A: drop the broad SELECT and
-- keep the scoped upload/update/delete policies (member's own folder only).
-- The seed script's --remove lists via the service role, which bypasses RLS.

drop policy if exists "Read profile photos" on storage.objects;
