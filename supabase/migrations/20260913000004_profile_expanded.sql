-- Extended profile fields for better matches.
-- Adds columns and an RPC to update them safely.

alter table public.profiles
  add column if not exists smoking text check (smoking in ('never', 'socially', 'quit')),
  add column if not exists drinking text check (drinking in ('never', 'socially', 'regularly')),
  add column if not exists religion text default null,
  add column if not exists has_kids boolean default false,
  add column if not exists lives_at_home boolean default false,
  add column if not exists hobbies text[] default '{}';

-- RPC to update extended profile fields in one call.
create or replace function public.update_profile_extended(
  p_user uuid,
  p_smoking text,
  p_drinking text,
  p_religion text,
  p_has_kids boolean,
  p_lives_at_home boolean,
  p_hobbies text[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set smoking = p_smoking,
      drinking = p_drinking,
      religion = p_religion,
      has_kids = p_has_kids,
      lives_at_home = p_lives_at_home,
      hobbies = coalesce(p_hobbies, '{}')
  where id = p_user;
end;
$$;
