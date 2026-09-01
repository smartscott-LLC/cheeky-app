-- Character Moments engine: common milestones use the fixed cast;
-- personal milestones pick the greeter by the member's interested_in
-- preference — privately, never displayed publicly (same rule as Speed
-- Dating grouping).
--
--   common (record_common_moment):  verification -> brutus, first_match -> dj
--   personal (record_personal_moment): membership / gift_accepted ->
--     interested_in 'women' -> hostess (Valentina)
--     interested_in 'men'   -> brutus   ("You need anything, just holler.")
--     anything else         -> chaz     (the velvet manager greets everyone)
--
-- All write paths are security-definer with no authenticated grant, so
-- members cannot spam greetings at each other. Lines are curated first;
-- AI-composed moments can reuse the same table + RPC rails later.

-- ============================================================
-- COMMON MOMENTS (fixed cast)
-- ============================================================
create or replace function public.record_common_moment(
  p_user uuid,
  p_milestone text -- verification | first_match
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_slug text;
  v_lines text[];
  v_line text;
begin
  if p_milestone = 'verification' then
    v_slug := 'brutus';
    v_lines := array[
      'ID. Step inside. You are good to go.',
      'A clean check is the best check. You earned your place on the floor.',
      'Hey. Breathe. You are in. Nobody messes with you on my floor.'
    ];
  elsif p_milestone = 'first_match' then
    v_slug := 'dj';
    v_lines := array[
      'Crossfading into match mode in 3... 2... 1... Drop!',
      'When the lights hit you, that is your moment — make it count.',
      'I have seen a lot of matches on this floor. Yours had the best song.'
    ];
  else
    return;
  end if;

  v_line := v_lines[1 + floor(random() * array_length(v_lines, 1))::int];
  perform public.record_character_moment(p_user, v_slug, p_milestone, v_line);
end;
$$;

-- ============================================================
-- FIRST MATCH — any match source (browse, dance floor, speed dating,
-- themed event) creates the row, so one trigger covers them all.
-- ============================================================
create or replace function public.handle_first_match_moment()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  foreach v_user in array array[new.user_id_a, new.user_id_b] loop
    if not exists (
      select 1 from public.matches m
      where (m.user_id_a = v_user or m.user_id_b = v_user)
        and m.id <> new.id
    ) and not exists (
      select 1 from public.character_moments
      where user_id = v_user and milestone = 'first_match'
    ) then
      perform public.record_common_moment(v_user, 'first_match');
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_first_match_moment on public.matches;
create trigger trg_first_match_moment
  after insert on public.matches
  for each row execute function public.handle_first_match_moment();

-- ============================================================
-- PERSONAL MOMENTS (orientation-aware cast)
-- ============================================================
create or replace function public.record_personal_moment(
  p_user uuid,
  p_milestone text -- membership | gift_accepted
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_pref text;
  v_slug text;
  v_lines text[];
  v_line text;
begin
  if p_milestone not in ('membership', 'gift_accepted') then
    return;
  end if;

  -- A purchase fires two webhook events (checkout.session.completed +
  -- customer.subscription.created) within seconds. Dedupe on 24h so the
  -- club greets you once per membership, not twice.
  if p_milestone = 'membership' and exists (
    select 1 from public.character_moments
    where user_id = p_user and milestone = 'membership'
      and created_at > now() - interval '24 hours'
  ) then
    return;
  end if;

  select coalesce(interested_in, 'everyone') into v_pref
  from public.profiles
  where id = p_user;

  if v_pref = 'women' then
    v_slug := 'hostess';   -- Valentina greets those who prefer women
  elsif v_pref = 'men' then
    v_slug := 'brutus';    -- Brutus greets those who prefer men
  else
    v_slug := 'chaz';      -- the manager greets everyone else
  end if;

  if p_milestone = 'membership' then
    if v_slug = 'hostess' then
      v_lines := array[
        'Welcome to Club Cheeky, darling. We have been expecting you.',
        'Step right past the rope — I have held our finest table for you.',
        'Your key just upgraded, darling. Enjoy the view from up here.'
      ];
    elsif v_slug = 'brutus' then
      v_lines := array[
        'You need anything, just holler. I will come running.',
        'New keys, new doors. You are on the list now. Good.',
        'Welcome to the floor. You earned your place. Stand tall.'
      ];
    else
      v_lines := array[
        'Oh, behave, baby! Welcome to Club Cheeky.',
        'Shagadelic! You just moved up the guest list.',
        'That is gold, baby. Pure gold. Welcome to the club.'
      ];
    end if;
  else -- gift_accepted
    if v_slug = 'hostess' then
      v_lines := array[
        'Someone sent you the velvet treatment, darling. Enjoy every minute.',
        'A gift, delivered in style. You have been noticed — and you deserve it.'
      ];
    elsif v_slug = 'brutus' then
      v_lines := array[
        'Someone is looking out for you tonight. Do not waste it.',
        'Gift is in, you are covered. Enjoy the room — you are good.'
      ];
    else
      v_lines := array[
        'A gift, delivered. Groovy, baby!',
        'Now that is how you get noticed. Enjoy it, my friend.'
      ];
    end if;
  end if;

  v_line := v_lines[1 + floor(random() * array_length(v_lines, 1))::int];
  perform public.record_character_moment(p_user, v_slug, p_milestone, v_line);
end;
$$;
