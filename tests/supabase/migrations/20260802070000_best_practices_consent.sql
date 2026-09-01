-- Best Practices consent: the external-activity disclaimer is acknowledged
-- at signup and stored in consents like terms/privacy. Policy lives in
-- docs/Governance/best-practices.md (v1).

-- The enum gets the new consent type. (The trigger only INSERTs at runtime,
-- so the value is usable once this migration commits.)
alter type public.consent_type add value 'best_practices';

create or replace function public.handle_new_profile()
returns trigger as $$
declare
  bday date := nullif(new.raw_user_meta_data->>'birthday', '')::date;
  retention int := nullif(new.raw_user_meta_data->>'message_retention_days', '')::int;
  terms_v text := new.raw_user_meta_data->>'terms_version';
  privacy_v text := new.raw_user_meta_data->>'privacy_version';
  best_v text := new.raw_user_meta_data->>'best_practices_version';
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

  if best_v is not null then
    insert into public.consents (user_id, consent_type, version)
    values (new.id, 'best_practices', best_v)
    on conflict (user_id, consent_type) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;
