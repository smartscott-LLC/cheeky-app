-- Signup hardening: the profile trigger now also applies the member-chosen
-- message retention (clamped 3-90 days) and records terms/privacy consents,
-- all passed through auth user metadata by the signup flow. This works
-- whether or not email confirmation is enabled (trigger runs server-side).
create or replace function public.handle_new_profile()
returns trigger as $$
declare
  bday date := nullif(new.raw_user_meta_data->>'birthday', '')::date;
  retention int := nullif(new.raw_user_meta_data->>'message_retention_days', '')::int;
  terms_v text := new.raw_user_meta_data->>'terms_version';
  privacy_v text := new.raw_user_meta_data->>'privacy_version';
begin
  insert into public.profiles (id, message_retention_days)
  values (new.id, coalesce(greatest(3, least(90, retention)), 90))
  on conflict (id) do nothing;

  insert into public.profile_private (id, birthday)
  values (new.id, bday)
  on conflict (id) do nothing;

  if terms_v is not null then
    insert into public.consents (user_id, consent_type, version)
    values (new.id, 'terms', terms_v)
    on conflict (user_id, consent_type) do nothing;
  end if;

  if privacy_v is not null then
    insert into public.consents (user_id, consent_type, version)
    values (new.id, 'privacy', privacy_v)
    on conflict (user_id, consent_type) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;
