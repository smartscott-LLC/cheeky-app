-- Date Night mutual-lock fix (PRD-event-logic §6, 2026-08-06): the round must
-- resolve only when BOTH partners have acted on the live question. The old
-- code resolved the moment the FIRST partner tapped (the other's unanswered
-- pick read as a skip), advanced the question, and the partner's tap then
-- landed on 'question_not_live' and was silently dropped — the mutual
-- same-option mechanic was unreachable and the game could never score.
--
-- New rules:
--   * both partners have a pick row  -> mutual same-option locks + scores;
--                                      differing picks keep the huddle open
--   * either side explicitly skips   -> a null pick (timeout/skip) closes the
--     (has a row with a null pick)      question as missed
--   * partner hasn't acted yet       -> the question waits (no resolution)

create or replace function public.tap_date_night(p_game uuid, p_index int, p_pick smallint)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_other uuid;
  v_game record;
  v_my_pick smallint;
  v_their_pick smallint;
  v_my_row boolean;
  v_their_row boolean;
  v_correct smallint;
  v_resolved boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select g.*, case when g.user_a = v_user then g.user_b else g.user_a end as other
    into v_game
  from public.date_nights g
  where g.id = p_game
    and (g.user_a = v_user or g.user_b = v_user);
  if v_game.id is null then
    raise exception 'game_not_found';
  end if;
  if v_game.status <> 'active' then
    raise exception 'game_finished';
  end if;
  if p_index <> v_game.current_index then
    raise exception 'question_not_live';
  end if;

  -- Record this partner's pick (upsert; re-taps overwrite).
  insert into public.date_night_picks (game_id, user_id, question_index, picked_index)
  values (p_game, v_user, p_index, p_pick)
  on conflict (game_id, user_id, question_index)
  do update set picked_index = excluded.picked_index;

  -- Resolve only when BOTH partners have a pick row on this question.
  -- A null pick (explicit skip/timeout, either side) closes it as missed.
  -- Mutual same-option locks it and scores. Differing picks: keep talking.
  select exists (
    select 1 from public.date_night_picks
    where game_id = p_game and user_id = v_user and question_index = p_index
  ) into v_my_row;
  select exists (
    select 1 from public.date_night_picks
    where game_id = p_game and user_id = v_game.other and question_index = p_index
  ) into v_their_row;
  select picked_index into v_my_pick
  from public.date_night_picks
  where game_id = p_game and user_id = v_user and question_index = p_index;
  select picked_index into v_their_pick
  from public.date_night_picks
  where game_id = p_game and user_id = v_game.other and question_index = p_index;

  v_resolved := false;
  if (v_my_row and v_my_pick is null) or (v_their_row and v_their_pick is null) then
    v_resolved := true; -- a skip on either side closes the question as missed
  elsif v_my_row and v_their_row and v_my_pick = v_their_pick then
    v_resolved := true; -- mutual same-option locks it
  end if;

  if v_resolved then
    if v_my_pick is not null and v_their_pick is not null and v_my_pick = v_their_pick then
      select correct_index into v_correct
      from public.trivia_questions
      where id = (v_game.question_ids->>p_index)::uuid;

      update public.date_nights
      set results = results || jsonb_build_object('i', p_index, 'correct', (v_my_pick = v_correct)),
          score = score + case when v_my_pick = v_correct then 1 else 0 end,
          current_index = current_index + 1,
          question_started_at = now(),
          status = case
            when current_index + 1 >= jsonb_array_length(question_ids) then 'finished'
            else 'active'
          end,
          finished_at = case
            when current_index + 1 >= jsonb_array_length(question_ids) then now()
            else null
          end
      where id = p_game;
    else
      update public.date_nights
      set results = results || jsonb_build_object('i', p_index, 'correct', false, 'missed', true),
          current_index = current_index + 1,
          question_started_at = now(),
          status = case
            when current_index + 1 >= jsonb_array_length(question_ids) then 'finished'
            else 'active'
          end,
          finished_at = case
            when current_index + 1 >= jsonb_array_length(question_ids) then now()
            else null
          end
      where id = p_game;
    end if;
  end if;
end;
$$;

grant execute on function public.tap_date_night(uuid, int, smallint) to authenticated;
