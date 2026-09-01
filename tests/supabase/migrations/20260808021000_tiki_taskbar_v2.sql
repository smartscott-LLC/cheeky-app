-- Tiki Taskbar v2 (founder's logic pass, 2026-08-08): the bar only carries
-- HARD-CAPPED daily allowances. Token-spend items (Dance Floor, Blind Date,
-- Speed Dating, Rooftop, gifts) never appear — we don't regulate what a
-- member spends their tokens on. This replaces taskbar_state: usage counts
-- only, and the API layer computes "left" against the tier caps.

-- ============================================================
-- TASKBAR STATE — hard-cap usage counts (v2, replaces v1)
-- ============================================================
drop function if exists public.taskbar_state();

create or replace function public.taskbar_state()
returns table (
  tier text,
  messages_sent_today bigint,
  new_people_today bigint,
  checked_in_today boolean,
  matchmaker_plays_left int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;
  return query
  select
    public.current_tier(v_user) as tier,
    (
      select count(*) from public.messages m
      where m.sender_id = v_user
        and m.created_at >= date_trunc('day', now())
    ) as messages_sent_today,
    (
      -- Distinct new conversation partners started today (the same count
      -- send_message's people-limit uses: non-matched partners only).
      select count(distinct
          case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.sender_id = v_user
        and m.created_at >= date_trunc('day', now())
        and not exists (
          select 1 from public.matches mt
          where mt.user_id_a = least(v_user, case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
            and mt.user_id_b = greatest(v_user, case when c.user_id_a = v_user then c.user_id_b else c.user_id_a end)
        )
    ) as new_people_today,
    exists (
      select 1 from public.daily_checkins
      where user_id = v_user and day = current_date
    ) as checked_in_today,
    -- Matchmaker isn't built yet; the 2/3/4/5 plays dial lands with it.
    null::int as matchmaker_plays_left;
end;
$$;

grant execute on function public.taskbar_state() to authenticated;
