-- Identity + dating preference (founder 2026-08-03).
-- Members must identify WHO they are (gentleman/lady — required at signup),
-- because the club pairs opposite preferences: the dance floor needs a real
-- gentleman on one side and a real lady on the other. No surprises — the
-- person you're messaging is who they say they are.
--
-- Preference (interested_in) already exists; this adds the identity side +
-- the mutual-compatibility rule that filters browse, event grids, and
-- cold messages.

alter table public.profiles
  add column gender text check (gender in ('gentleman', 'lady'));

-- Signup writes identity + preference into auth metadata; the profile
-- trigger picks them up (same path as birthday).
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.profiles (id, gender, interested_in)
  values (new.id,
          nullif(new.raw_user_meta_data->>'gender', ''),
          coalesce(nullif(new.raw_user_meta_data->>'interested_in', ''), 'everyone'));
  insert into public.profile_private (id, birthday)
  values (new.id, nullif(new.raw_user_meta_data->>'birthday', '')::date);
  return new;
end;
$$ language plpgsql security definer;

-- MUTUAL COMPATIBILITY: two members see each other only when each is in the
-- other's dating preference.
--   interested_in 'women'      -> they're looking for a lady
--   interested_in 'men'        -> they're looking for a gentleman
--   interested_in 'everyone'   -> open to both
create or replace function public.compatible(a uuid, b uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1
    from public.profiles pa
    join public.profiles pb on true
    where pa.id = a and pb.id = b
      and pa.gender is not null and pb.gender is not null
      and pa.interested_in in ('everyone', case pb.gender when 'lady' then 'women' else 'men' end)
      and pb.interested_in in ('everyone', case pa.gender when 'lady' then 'women' else 'men' end)
  );
$$;
