-- Fix matchmaker draft toggle: add RPC to un-pick a draft target.
-- The pick RPC rejects new picks when v_count >= 2, but un-picking was
-- client-only — server still had 2 picks, blocking any replacement pick.

create or replace function public.matchmaker_unpick_draft(p_target uuid)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_board uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_board
  from public.matchmaker_boards
  where user_id = v_user and status = 'drafting'
  order by created_at desc
  limit 1;

  if v_board is null then
    raise exception 'no_draft_in_progress';
  end if;

  delete from public.matchmaker_drafts
  where board_id = v_board and target_id = p_target;
end;
$$;

grant execute on function public.matchmaker_unpick_draft(uuid) to authenticated;
