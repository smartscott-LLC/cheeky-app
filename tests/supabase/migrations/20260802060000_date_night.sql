-- Couple Trivia ("Date Night"), Phase 5: matched pairs only, free, in-chat.
-- The couple's answer locks only when BOTH tap the same option (the Dance
-- Floor mutual-pick mechanic, used for agreement). Rewards: badges/streaks
-- only — no tokens (PRD-phase5-wing.md §4).

-- ============================================================
-- QUESTION BANK (explicit ids so packs can reference them)
-- ============================================================
create table public.trivia_questions (
  id uuid primary key,
  prompt text not null,
  options jsonb not null,        -- ["A", "B", "C", "D"]
  correct_index smallint not null,
  category text not null default 'general',
  active boolean not null default true
);

insert into public.trivia_questions (id, prompt, options, correct_index, category) values
  ('10000000-0000-0000-0000-000000000001', 'Which band sang "Bohemian Rhapsody"?', '["The Beatles","Queen","Pink Floyd","Led Zeppelin"]', 1, 'music'),
  ('10000000-0000-0000-0000-000000000002', 'What instrument does a DJ scratch?', '["Turntables","Synthesizer","Sampler","Guitar"]', 0, 'music'),
  ('10000000-0000-0000-0000-000000000003', 'Which dance originated in Argentina?', '["Salsa","Tango","Flamenco","Samba"]', 1, 'music'),
  ('10000000-0000-0000-0000-000000000004', 'What is the highest female singing voice?', '["Alto","Mezzo-soprano","Soprano","Contralto"]', 2, 'music'),
  ('10000000-0000-0000-0000-000000000005', 'Which genre is the DJ set built on at Club Cheeky?', '["Classical","Country","Electronic dance music","Jazz"]', 2, 'music'),
  ('10000000-0000-0000-0000-000000000006', 'In which country was pizza invented?', '["Greece","France","Spain","Italy"]', 3, 'food'),
  ('10000000-0000-0000-0000-000000000007', 'What pasta is shaped like small rice grains?', '["Fusilli","Orzo","Penne","Farfalle"]', 1, 'food'),
  ('10000000-0000-0000-0000-000000000008', 'What does a classic margarita rim?', '["Sugar","Salt","Chili","Cocoa"]', 1, 'food'),
  ('10000000-0000-0000-0000-000000000009', 'Which fruit is known as the "king of fruits"?', '["Mango","Papaya","Durian","Pineapple"]', 2, 'food'),
  ('10000000-0000-0000-0000-000000000010', 'What is the most consumed beverage after water?', '["Coffee","Soda","Tea","Milk"]', 2, 'food'),
  ('10000000-0000-0000-0000-000000000011', 'Which artist painted the Mona Lisa?', '["Michelangelo","Leonardo da Vinci","Raphael","Donatello"]', 1, 'movies'),
  ('10000000-0000-0000-0000-000000000012', 'Which Disney movie features the clownfish Nemo?', '["Moana","Tangled","Frozen","Finding Nemo"]', 3, 'movies'),
  ('10000000-0000-0000-0000-000000000013', 'What is the name of the fairy in Peter Pan?', '["Fairy Mary","Tinker Bell","Silvermist","Rosetta"]', 1, 'movies'),
  ('10000000-0000-0000-0000-000000000014', 'In which film did the phrase "May the Force be with you" originate?', '["Star Wars","Alien","Blade Runner","Dune"]', 0, 'movies'),
  ('10000000-0000-0000-0000-000000000015', 'What year did the first iPhone launch?', '["2005","2006","2007","2008"]', 2, 'movies'),
  ('10000000-0000-0000-0000-000000000016', 'Which city is known as the "City of Love"?', '["Rome","Paris","Venice","Prague"]', 1, 'travel'),
  ('10000000-0000-0000-0000-000000000017', 'Which city hosted the 2016 Summer Olympics?', '["London","Tokyo","Rio de Janeiro","Beijing"]', 2, 'travel'),
  ('10000000-0000-0000-0000-000000000018', 'What is the national drink of Japan?', '["Shochu","Sake","Umeshu","Soju"]', 1, 'travel'),
  ('10000000-0000-0000-0000-000000000019', 'What is the capital of Australia?', '["Sydney","Melbourne","Canberra","Perth"]', 2, 'travel'),
  ('10000000-0000-0000-0000-000000000020', 'Which country has the most time zones?', '["USA","Russia","France","China"]', 2, 'travel'),
  ('10000000-0000-0000-0000-000000000021', 'Which planet is known as the Red Planet?', '["Venus","Jupiter","Mars","Saturn"]', 2, 'nature'),
  ('10000000-0000-0000-0000-000000000022', 'What is the hottest planet in our solar system?', '["Mercury","Mars","Jupiter","Venus"]', 3, 'nature'),
  ('10000000-0000-0000-0000-000000000023', 'Which sea creature has three hearts?', '["Shark","Squid","Octopus","Crab"]', 2, 'nature'),
  ('10000000-0000-0000-0000-000000000024', 'What is the only mammal that can truly fly?', '["Flying squirrel","Bat","Sugar glider","Colugo"]', 1, 'nature'),
  ('10000000-0000-0000-0000-000000000025', 'What is the tallest animal in the world?', '["Elephant","Giraffe","Ostrich","Camel"]', 1, 'nature');

-- ============================================================
-- PACKS (5 questions each — the leaderboard compares same packs)
-- ============================================================
create table public.trivia_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  question_ids jsonb not null,
  active boolean not null default true
);

insert into public.trivia_packs (id, name, question_ids) values
  ('20000000-0000-0000-0000-000000000001', 'Music & Dancing', '["10000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000002","10000000-0000-0000-0000-000000000003","10000000-0000-0000-0000-000000000004","10000000-0000-0000-0000-000000000005"]'),
  ('20000000-0000-0000-0000-000000000002', 'Food & Date Night', '["10000000-0000-0000-0000-000000000006","10000000-0000-0000-0000-000000000007","10000000-0000-0000-0000-000000000008","10000000-0000-0000-0000-000000000009","10000000-0000-0000-0000-000000000010"]'),
  ('20000000-0000-0000-0000-000000000003', 'Movies & Pop Culture', '["10000000-0000-0000-0000-000000000011","10000000-0000-0000-0000-000000000012","10000000-0000-0000-0000-000000000013","10000000-0000-0000-0000-000000000014","10000000-0000-0000-0000-000000000015"]'),
  ('20000000-0000-0000-0000-000000000004', 'Travel & World', '["10000000-0000-0000-0000-000000000016","10000000-0000-0000-0000-000000000017","10000000-0000-0000-0000-000000000018","10000000-0000-0000-0000-000000000019","10000000-0000-0000-0000-000000000020"]'),
  ('20000000-0000-0000-0000-000000000005', 'Fun Facts & Nature', '["10000000-0000-0000-0000-000000000021","10000000-0000-0000-0000-000000000022","10000000-0000-0000-0000-000000000023","10000000-0000-0000-0000-000000000024","10000000-0000-0000-0000-000000000025"]')
on conflict (id) do nothing;

-- ============================================================
-- DATE NIGHTS (one active game per pair; rounds resolve in order)
-- ============================================================
create table public.date_nights (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references auth.users(id) on delete cascade not null,
  user_b uuid references auth.users(id) on delete cascade not null,
  pack_id uuid references public.trivia_packs(id) not null,
  question_ids jsonb not null,
  current_index int not null default 0,
  results jsonb not null default '[]',   -- [{i, correct}] for resolved rounds
  score int not null default 0,
  status text not null default 'active' check (status in ('active', 'finished')),
  question_started_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (user_a < user_b)
);

alter table public.date_nights enable row level security;
create policy "Date nights are visible to the couple"
  on public.date_nights for select
  using (user_a = auth.uid() or user_b = auth.uid());

-- ============================================================
-- DATE NIGHT PICKS (each partner's tap per question)
-- ============================================================
create table public.date_night_picks (
  id bigint generated always as identity primary key,
  game_id uuid references public.date_nights(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_index int not null,
  picked_index smallint,          -- null = skipped/timed out
  created_at timestamptz not null default now(),
  unique (game_id, user_id, question_index)
);

alter table public.date_night_picks enable row level security;
create policy "Read your own picks"
  on public.date_night_picks for select using (user_id = auth.uid());

-- ============================================================
-- START_DATE_NIGHT — matched pair, one active game, random pack
-- ============================================================
create or replace function public.start_date_night(p_other uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pair_a uuid;
  v_pair_b uuid;
  v_pack uuid;
  v_qids jsonb;
  v_game uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_other is null or p_other = v_user then
    raise exception 'invalid_partner';
  end if;

  v_pair_a := least(v_user, p_other);
  v_pair_b := greatest(v_user, p_other);

  -- Must be a real active match.
  if not exists (
    select 1 from public.matches
    where user_id_a = v_pair_a and user_id_b = v_pair_b
      and status = 'active'
  ) then
    raise exception 'match_required';
  end if;

  -- One active game per pair.
  if exists (
    select 1 from public.date_nights
    where user_a = v_pair_a and user_b = v_pair_b and status = 'active'
  ) then
    raise exception 'game_active';
  end if;

  select id, question_ids into v_pack, v_qids
  from public.trivia_packs
  where active
  order by random()
  limit 1;

  insert into public.date_nights (user_a, user_b, pack_id, question_ids, status)
  values (v_pair_a, v_pair_b, v_pack, v_qids, 'active')
  returning id into v_game;

  return v_game;
end;
$$;

grant execute on function public.start_date_night(uuid) to authenticated;

-- ============================================================
-- TAP_DATE_NIGHT — set your pick; mutual same-option locks the
-- answer and advances. null pick = skip (missed). No reveal of the
-- partner's pick — the huddle is real conversation.
-- ============================================================
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

  -- Resolve only when BOTH partners have acted on this question.
  select myp.picked_index, theirp.picked_index
    into v_my_pick, v_their_pick
  from public.date_night_picks myp
  left join public.date_night_picks theirp
    on theirp.game_id = myp.game_id
   and theirp.question_index = myp.question_index
   and theirp.user_id = v_game.other
  where myp.game_id = p_game
    and myp.question_index = p_index
    and myp.user_id = v_user;

  v_resolved := false;

  -- A timeout/skip (either side) closes the question as missed. Otherwise
  -- mutual same-option locks it. Differing picks: keep talking, re-tap.
  if v_my_pick is null or v_their_pick is null then
    v_resolved := true;
  elsif v_my_pick = v_their_pick then
    v_resolved := true;
  end if;

  if v_resolved then
    if v_my_pick is not null and v_their_pick is not null and v_my_pick = v_their_pick then
      select correct_index into v_correct
      from public.trivia_questions
      where id = (v_game.question_ids->p_index)::text::uuid;

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

-- ============================================================
-- DATE_NIGHT_STATE — the couple's view: game row + whether the
-- partner has acted on the live question (never WHAT they picked).
-- ============================================================
create or replace function public.date_night_state(p_game uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_other uuid;
  v_game record;
  v_partner_picked boolean;
  v_my_pick smallint;
  v_question_obj jsonb;
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

  select picked_index into v_my_pick
  from public.date_night_picks
  where game_id = p_game and user_id = v_user and question_index = v_game.current_index;

  select exists (
    select 1 from public.date_night_picks
    where game_id = p_game and user_id = v_game.other and question_index = v_game.current_index
  ) into v_partner_picked;

  -- The live question (id only — the client fetches prompt/options).
  v_question_obj := jsonb_build_object('id', v_game.question_ids->v_game.current_index);

  return jsonb_build_object(
    'game', jsonb_build_object(
      'id', v_game.id,
      'status', v_game.status,
      'current_index', v_game.current_index,
      'total', jsonb_array_length(v_game.question_ids),
      'score', v_game.score,
      'results', v_game.results,
      'question_started_at', v_game.question_started_at,
      'started_at', v_game.started_at,
      'finished_at', v_game.finished_at,
      'pack_id', v_game.pack_id,
      'question_id', v_question_obj->>'id'
    ),
    'my_pick', v_my_pick,
    'partner_picked', v_partner_picked,
    'other', v_game.other
  );
end;
$$;

grant execute on function public.date_night_state(uuid) to authenticated;
