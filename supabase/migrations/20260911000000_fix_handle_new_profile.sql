-- Fix broken handle_new_profile introduced by fn_search_path migration.
-- The fn_search_path migration replaced handle_new_profile with a version
-- that only writes id and message_retention_days, dropping gender and
-- interested_in. Without gender, the compatible() function rejects everyone
-- because it requires both genders to be non-null, making the SPARX empty.
--
-- Restores the full version that writes all identity fields from auth
-- metadata at signup.

create or replace function public.handle_new_profile()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, gender, interested_in)
  values (new.id,
          nullif(new.raw_user_meta_data->>'gender', ''),
          coalesce(nullif(new.raw_user_meta_data->>'interested_in', ''), 'everyone'));
  insert into public.profile_private (id, birthday)
  values (new.id, nullif(new.raw_user_meta_data->>'birthday', '')::date);
  return new;
end;
$$;
