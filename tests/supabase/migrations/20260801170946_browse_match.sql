-- Browse & match: one-way likes; a mutual like is an instant match.
-- Writes go through the create_like RPC (security definer) — no direct
-- insert policies on likes/matches, so matching can't be forged client-side.

-- ============================================================
-- LIKES
-- ============================================================
create table public.likes (
  id bigint generated always as identity primary key,
  liker_id uuid references auth.users(id) on delete cascade not null,
  likee_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (liker_id, likee_id),
  check (liker_id <> likee_id)
);

alter table public.likes enable row level security;

create policy "Read likes you sent or received"
  on public.likes for select
  using (liker_id = auth.uid() or likee_id = auth.uid());

-- ============================================================
-- MATCHES
-- ============================================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid references auth.users(id) on delete cascade not null,
  user_id_b uuid references auth.users(id) on delete cascade not null,
  source text not null default 'browse',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  check (user_id_a < user_id_b),
  unique (user_id_a, user_id_b)
);

alter table public.matches enable row level security;

create policy "Read matches you are part of"
  on public.matches for select
  using (user_id_a = auth.uid() or user_id_b = auth.uid());

-- ============================================================
-- CREATE_LIKE RPC — atomic like + instant mutual match
-- ============================================================
create or replace function public.create_like(p_likee uuid)
returns table (match_id uuid)
language plpgsql security definer
set search_path = public
as $$
declare
  v_liker uuid := auth.uid();
  v_match uuid;
begin
  if v_liker is null then
    raise exception 'not_authenticated';
  end if;
  if v_liker = p_likee then
    raise exception 'cannot_like_self';
  end if;

  insert into public.likes (liker_id, likee_id)
  values (v_liker, p_likee)
  on conflict (liker_id, likee_id) do nothing;

  if exists (
    select 1 from public.likes
    where liker_id = p_likee and likee_id = v_liker
  ) then
    insert into public.matches (user_id_a, user_id_b, source)
    values (least(v_liker, p_likee), greatest(v_liker, p_likee), 'browse')
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_match;
  end if;

  return query select v_match;
end;
$$;

grant execute on function public.create_like(uuid) to authenticated;
