-- Test members: dummy profiles that populate trios/boards for the owner's
-- walkthroughs. They are INVISIBLE to real members — the spark RPCs show
-- test members only to callers who are also test-flagged, so production
-- never serves a fake face (no fake activity, per the mission guardrails).

alter table public.profiles
  add column if not exists test_member boolean not null default false;

-- ============================================================
-- L3_TRIO — include test members only for test callers
-- ============================================================
create or replace function public.l3_trio()
returns table (
  id uuid,
  display_name text,
  bio text,
  one_liner text,
  gender text,
  interested_in text,
  photo_path text
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select p.id,
         p.display_name,
         p.bio,
         p.one_liner,
         p.gender,
         p.interested_in,
         (select ph.storage_path
          from public.photos ph
          where ph.user_id = p.id
            and ph.held_at is null
          order by ph.is_primary desc, ph.position
          limit 1) as photo_path
  from public.profiles p
  where p.id <> v_user
    and p.verified_at is not null
    and p.bot_flagged_at is null
    and (not p.test_member or exists (
      select 1 from public.profiles me
      where me.id = v_user and me.test_member
    ))
    and not exists (
      select 1 from public.l3_picks lp
      where lp.picker_id = v_user and lp.target_id = p.id
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = v_user and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = v_user)
    )
    and exists (
      select 1 from public.photos ph
      where ph.user_id = p.id and ph.held_at is null
    )
  order by random()
  limit 12;
end;
$$;

grant execute on function public.l3_trio() to authenticated;
