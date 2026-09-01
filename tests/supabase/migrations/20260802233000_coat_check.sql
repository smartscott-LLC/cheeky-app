-- The Coat Check (Phase 5 collectibles room) — where every member's
-- collection lives: gems (limited collectible cards), badges (achievements),
-- the gift stash, certificates, and character bonds. The Coat Check's
-- character: "Nothing gets lost in my care — gifts included."
--
-- The daily streak lives HERE on purpose: checking in at the Coat Check is
-- your daily check-in (the coat you hand her = your day with the club).
-- Streaks feed badges — 7 days = Regular, 30 days = the Pearl.

-- ============================================================
-- GEMS — limited collectible cards
-- ============================================================
create table public.gem_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  emoji text not null,
  rarity text not null default 'rare', -- common | rare | legendary
  how_to_earn text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gem_catalog enable row level security;
create policy "Gems are public"
  on public.gem_catalog for select using (true);

insert into public.gem_catalog (slug, name, emoji, rarity, how_to_earn) values
  ('ruby',     'Ruby',     '🔴', 'rare',      'Found on the dance floor — take the floor and let the DJ see you.'),
  ('emerald',  'Emerald',  '🟢', 'rare',      'Earned through referrals that join the club and pass the door.'),
  ('sapphire', 'Sapphire', '🔵', 'rare',      'Awarded by the club for moments that keep the floor alive.'),
  ('topaz',    'Topaz',    '🟡', 'legendary', 'The rarest in the vault — given by the owner. Nobody earns Topaz twice.')
on conflict (slug) do nothing;

create table public.member_gems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  gem_id uuid references public.gem_catalog(id) on delete cascade not null,
  earned_at timestamptz not null default now(),
  ref text,
  unique (user_id, gem_id)
);

alter table public.member_gems enable row level security;
create policy "Read your gems"
  on public.member_gems for select using (user_id = auth.uid());

-- ============================================================
-- BADGES — achievements
-- ============================================================
create table public.badge_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  emoji text not null,
  description text not null,
  how_to_earn text not null,
  created_at timestamptz not null default now()
);

alter table public.badge_catalog enable row level security;
create policy "Badges are public"
  on public.badge_catalog for select using (true);

insert into public.badge_catalog (slug, name, emoji, description, how_to_earn) values
  ('verified',    'In the Club', '🪪', 'You cleared the door.',       'Pass Brutus\u2019s door check.'),
  ('first_match', 'The Connection', '💞', 'Your first match.',        'Match with someone for the first time.'),
  ('first_event', 'First Dance', '🪩', 'Your first event.',           'Join any event on the floor.'),
  ('streak_7',    'Regular',     '📅', 'A week with the club.',       'Check in at the Coat Check 7 days in a row.'),
  ('pearl',       'Pearl',       '🦪', 'A full month. Rare as the sea.', 'Check in at the Coat Check 30 days in a row.')
on conflict (slug) do nothing;

create table public.member_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id uuid references public.badge_catalog(id) on delete cascade not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table public.member_badges enable row level security;
create policy "Read your badges"
  on public.member_badges for select using (user_id = auth.uid());

-- ============================================================
-- DAILY CHECK-INS — the Coat Check streak
-- ============================================================
create table public.daily_checkins (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.daily_checkins enable row level security;
create policy "Read your check-ins"
  on public.daily_checkins for select using (user_id = auth.uid());

-- ============================================================
-- AWARD RPCS — service-role only (no authenticated grants)
-- ============================================================
create or replace function public.award_badge(p_user uuid, p_slug text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.member_badges (user_id, badge_id)
  select p_user, id from public.badge_catalog where slug = p_slug
  on conflict (user_id, badge_id) do nothing;
end;
$$;

create or replace function public.award_gem(p_user uuid, p_slug text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.member_gems (user_id, gem_id)
  select p_user, id from public.gem_catalog where slug = p_slug
  on conflict (user_id, gem_id) do nothing;
end;
$$;

-- ============================================================
-- RECORD CHECK-IN — the daily streak + streak badges
-- ============================================================
create or replace function public.record_checkin()
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_streak int := 0;
  v_day date;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.daily_checkins (user_id, day)
  values (v_user, current_date)
  on conflict (user_id, day) do nothing;

  v_day := current_date;
  while exists (
    select 1 from public.daily_checkins
    where user_id = v_user and day = v_day
  ) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  if v_streak >= 7 then
    perform public.award_badge(v_user, 'streak_7');
  end if;
  if v_streak >= 30 then
    perform public.award_badge(v_user, 'pearl');
  end if;

  return v_streak;
end;
$$;

grant execute on function public.record_checkin() to authenticated;

-- ============================================================
-- MILESTONE WIRES — first match + first event award badges
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
      perform public.award_badge(v_user, 'first_match');
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_first_match_moment on public.matches;
create trigger trg_first_match_moment
  after insert on public.matches
  for each row execute function public.handle_first_match_moment();

create or replace function public.handle_first_event_badge()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.event_entries
    where user_id = new.user_id and id <> new.id
  ) then
    perform public.award_badge(new.user_id, 'first_event');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_first_event_badge on public.event_entries;
create trigger trg_first_event_badge
  after insert on public.event_entries
  for each row execute function public.handle_first_event_badge();
