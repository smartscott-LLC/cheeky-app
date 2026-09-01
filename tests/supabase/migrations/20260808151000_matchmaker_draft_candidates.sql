-- Matchmaker draft phase (2026-08-08): the client-side swipe strip needs a
-- server-filtered candidate list (floor-or-beneath, compatible, not already
-- liked/matched/blocked — the same pool pick_draft validates against).
-- Already-picked targets come back flagged so a resumed draft renders.

create or replace function public.matchmaker_draft_candidates()
returns table (
  id uuid,
  display_name text,
  bio text,
  one_liner text,
  gender text,
  interested_in text,
  photo_path text,
  picked boolean
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board uuid;
begin
  if v_user is null then
    return;
  end if;

  select b.id into v_board
  from public.matchmaker_boards b
  where b.user_id = v_user and b.status = 'drafting'
  order by b.created_at desc
  limit 1;

  return query
  select
    p.id,
    p.display_name,
    p.bio,
    p.one_liner,
    p.gender,
    p.interested_in,
    (select ph.storage_path
     from public.photos ph
     where ph.user_id = p.id and ph.held_at is null
     order by ph.is_primary desc, ph.position
     limit 1) as photo_path,
    exists (
      select 1 from public.matchmaker_drafts d
      where d.board_id = v_board and d.target_id = p.id
    ) as picked
  from public.profiles p
  where p.id <> v_user
    and p.verified_at is not null
    and p.bot_flagged_at is null
    and (not p.test_member or exists (
      select 1 from public.profiles me
      where me.id = v_user and me.test_member
    ))
    and public.tier_rank(public.current_tier(p.id)) <= public.tier_rank(public.current_tier(v_user))
    and public.compatible(v_user, p.id)
    and not exists (
      select 1 from public.likes l
      where l.liker_id = v_user and l.likee_id = p.id
    )
    and not exists (
      select 1 from public.matches m
      where m.user_id_a = least(v_user, p.id)
        and m.user_id_b = greatest(v_user, p.id)
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
  order by picked desc, random()
  limit 12;
end;
$$;

grant execute on function public.matchmaker_draft_candidates() to authenticated;
