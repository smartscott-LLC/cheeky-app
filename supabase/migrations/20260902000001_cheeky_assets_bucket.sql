-- App assets bucket: icons, brand images, persona graphics, coat check
-- personas, floor cards, audio files. Public read, service-role write only.
-- Path convention: <category>/<filename> (e.g. icons/chat_bubble.webp)

-- ============================================================
-- BUCKET
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cheeky-assets',
  'cheeky-assets',
  true,
  5242880,  -- 5 MB per file
  array['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'image/x-icon']
)
on conflict (id) do nothing;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Public read: anyone can view assets (they're public by bucket setting,
-- but the policy is explicit for RLS consistency).
create policy "Read cheeky-assets"
  on storage.objects for select
  using (bucket_id = 'cheeky-assets');

-- Service-role write only: no authenticated user can upload/update/delete.
-- The upload script uses the service-role key.
create policy "Service role upload cheeky-assets"
  on storage.objects for insert
  with check (
    bucket_id = 'cheeky-assets'
    and (auth.role() = 'service_role')
  );

create policy "Service role update cheeky-assets"
  on storage.objects for update
  using (
    bucket_id = 'cheeky-assets'
    and (auth.role() = 'service_role')
  );

create policy "Service role delete cheeky-assets"
  on storage.objects for delete
  using (
    bucket_id = 'cheeky-assets'
    and (auth.role() = 'service_role')
  );