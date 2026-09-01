-- Profile photos: hard 3-photo cap for Silver and below (Phase 4 will raise
-- this per paid floor) + storage RLS policies so members can manage their
-- own uploads in the public 'profiles' bucket.

-- ============================================================
-- PHOTO LIMIT TRIGGER (3 max — Silver and below)
-- ============================================================
create or replace function public.enforce_photo_limit()
returns trigger as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.photos
  where user_id = new.user_id;

  if v_count >= 3 then
    raise exception 'photo_limit_reached';
  end if;

  return new;
end;
$$ language plpgsql security definer
set search_path = public;

create trigger photos_limit_before_insert
  before insert on public.photos
  for each row execute procedure public.enforce_photo_limit();

-- ============================================================
-- STORAGE POLICIES (public 'profiles' bucket)
-- Path convention: <user_id>/<file> — the first folder is the owner.
-- ============================================================
create policy "Read profile photos"
  on storage.objects for select
  using (bucket_id = 'profiles');

create policy "Upload your own profile photos"
  on storage.objects for insert
  with check (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Update your own profile photos"
  on storage.objects for update
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Delete your own profile photos"
  on storage.objects for delete
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
