-- Date Night extras: RLS on the question bank (public content) + the
-- couples leaderboard (scores only, no PII — couples compete anonymously).

alter table public.trivia_questions enable row level security;
create policy "Questions are public"
  on public.trivia_questions for select using (true);

alter table public.trivia_packs enable row level security;
create policy "Packs are public"
  on public.trivia_packs for select using (true);

-- The leaderboard: finished games for a pack, ranked by score. Scores only —
-- couples are compared anonymously ("you beat 12 of 15 couples").
create or replace function public.date_night_leaderboard(p_pack uuid)
returns table (score int)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
    select dn.score
    from public.date_nights dn
    where dn.pack_id = p_pack
      and dn.status = 'finished'
    order by dn.score desc
    limit 50;
end;
$$;

grant execute on function public.date_night_leaderboard(uuid) to authenticated;
