-- Speed Dating 4B: certificate-gated Special Interests.
-- You can only add someone to your Special Interests if you hold a
-- certificate from a match with them (PRD: "certificate unlocks ... the
-- special-interests list"). Enforced server-side, never in the UI alone.

create or replace function public.add_special_interest(p_interest_user uuid)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cert uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_interest_user is null or p_interest_user = v_user then
    raise exception 'invalid_user';
  end if;

  -- Must hold a certificate in a match with this person.
  select c.id into v_cert
  from public.certificates c
  join public.matches m on m.id = c.match_id
  where c.user_id = v_user
    and (m.user_id_a = p_interest_user or m.user_id_b = p_interest_user)
  limit 1;

  if v_cert is null then
    raise exception 'certificate_required';
  end if;

  insert into public.special_interests (user_id, interest_user_id)
  values (v_user, p_interest_user)
  on conflict (user_id, interest_user_id) do nothing;

  return 'added';
end;
$$;

grant execute on function public.add_special_interest(uuid) to authenticated;
