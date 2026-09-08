-- Lounge Cheeky Challenge — matchmaking, game state, and leaderboard
--
-- Three tables + RPCs for the lounge's Cheeky Challenge mini-game:
--   challenge_queue     — ephemeral queue entries for matchmaking
--   challenge_matches   — persistent match records with scores
--   challenge_leaderboard — today's top pairs (read-only after insert)
--
-- The challenge server (chub's route.js) uses service-role writes for
-- all operations; RLS on the queue and match tables is a secondary
-- safety net, not the primary access path.

-- ============================================================
-- CHALLENGE QUEUE — who's looking for a game right now
-- ============================================================
create table public.challenge_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  name text not null,
  tier text not null default 'silver',
  preference text not null default 'any',
  joined_at timestamptz not null default now()
);

alter table public.challenge_queue enable row level security;

-- Queue entries are ephemeral — the server cleans them up.
-- RLS allows the owning user to see/delete their own entry.
create policy "users_read_own_queue"
  on public.challenge_queue for select
  using (auth.uid() = user_id);

create policy "users_delete_own_queue"
  on public.challenge_queue for delete
  using (auth.uid() = user_id);

create index challenge_queue_joined_idx
  on public.challenge_queue (joined_at);

-- ============================================================
-- CHALLENGE MATCHES — one row per completed or active match
-- ============================================================
create table public.challenge_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null,
  player2_id uuid not null,
  p1_name text not null,
  p2_name text not null,
  p1_tier text not null default 'silver',
  p2_tier text not null default 'silver',
  p1_is_bot boolean not null default false,
  p2_is_bot boolean not null default false,
  seed integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  p1_score integer not null default 0,
  p2_score integer not null default 0,
  p1_round_scores jsonb default '[]'::jsonb,
  p2_round_scores jsonb default '[]'::jsonb,
  bonus_breakdown jsonb,
  grand_total integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.challenge_matches enable row level security;

create policy "participants_read_match"
  on public.challenge_matches for select
  using (auth.uid() = player1_id::uuid or auth.uid() = player2_id::uuid);

create index challenge_matches_created_idx
  on public.challenge_matches (created_at desc);

-- ============================================================
-- CHALLENGE LEADERBOARD — today's top pairs (capped at 20)
-- ============================================================
create table public.challenge_leaderboard (
  id bigint generated always as identity primary key,
  match_id uuid references public.challenge_matches(id) on delete cascade,
  p1_name text not null,
  p2_name text not null,
  p1_score integer not null default 0,
  p2_score integer not null default 0,
  total_score integer not null default 0,
  bonus_breakdown jsonb,
  day text not null,
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.challenge_leaderboard enable row level security;

-- Leaderboard is public-read (any authenticated user can see scores)
create policy "authenticated_read_leaderboard"
  on public.challenge_leaderboard for select
  using (auth.role() = 'authenticated');

create index challenge_leaderboard_day_score_idx
  on public.challenge_leaderboard (day, total_score desc);

-- ============================================================
-- RPC: Insert a completed match into the leaderboard
-- ============================================================
create or replace function public.insert_challenge_leaderboard(
  p_match_id uuid,
  p_p1_name text,
  p_p2_name text,
  p_p1_score integer,
  p_p2_score integer,
  p_total_score integer,
  p_bonus_breakdown jsonb,
  p_is_bot boolean
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_day text := to_char(now(), 'YYYY-MM-DD');
  v_count integer;
begin
  -- Keep only top 20 per day
  select count(*) into v_count
  from public.challenge_leaderboard
  where day = v_day;

  if v_count >= 20 then
    -- Only insert if score beats the 20th place
    if p_total_score <= (
      select min(total_score) from (
        select total_score from public.challenge_leaderboard
        where day = v_day
        order by total_score desc
        limit 20
      ) sub
    ) then
      return;
    end if;
  end if;

  insert into public.challenge_leaderboard
    (match_id, p1_name, p2_name, p1_score, p2_score, total_score, bonus_breakdown, day, is_bot)
  values
    (p_match_id, p_p1_name, p_p2_name, p_p1_score, p_p2_score, p_total_score, p_bonus_breakdown, v_day, p_is_bot);

  -- Prune to top 20
  delete from public.challenge_leaderboard
  where id in (
    select id from public.challenge_leaderboard
    where day = v_day
    order by total_score desc
    offset 20
  );
end;
$$;

grant execute on function public.insert_challenge_leaderboard(uuid, text, text, integer, integer, integer, jsonb, boolean) to service_role;

-- ============================================================
-- RPC: Get today's leaderboard top 5
-- ============================================================
create or replace function public.get_challenge_leaderboard()
returns table (
  match_id uuid,
  rank bigint,
  p1_name text,
  p2_name text,
  total_score integer,
  bonus_breakdown jsonb,
  is_bot boolean,
  created_at timestamptz
)
language plpgsql stable
set search_path = public
as $$
begin
  return query
  select
    cl.match_id,
    row_number() over (order by cl.total_score desc) as rank,
    cl.p1_name,
    cl.p2_name,
    cl.total_score,
    cl.bonus_breakdown,
    cl.is_bot,
    cl.created_at
  from public.challenge_leaderboard cl
  where cl.day = to_char(now(), 'YYYY-MM-DD')
  order by cl.total_score desc
  limit 5;
end;
$$;

grant execute on function public.get_challenge_leaderboard() to service_role;
grant execute on function public.get_challenge_leaderboard() to authenticated;