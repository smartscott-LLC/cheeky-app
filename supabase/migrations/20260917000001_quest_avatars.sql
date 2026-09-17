-- Avatar storage for Quest app
create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Unnamed Hero',
  rpg_class text not null default 'adventurer',
  generation_type text not null default 'manual',
  config jsonb not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.avatars enable row level security;

-- Allow authenticated users to insert their own avatars
create policy "Users can insert own avatars"
  on public.avatars for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Allow users to read their own avatars
create policy "Users can read own avatars"
  on public.avatars for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous (quest app) to insert avatars without user_id
create policy "Anonymous insert allowed"
  on public.avatars for insert
  to anon
  with check (user_id is null);

-- Allow service role to bypass RLS (for admin/management)
create policy "Service role full access"
  on public.avatars for all
  to service_role
  using (true)
  with check (true);
