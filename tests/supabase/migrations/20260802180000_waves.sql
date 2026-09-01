-- The Wave: a one-tap "noticed you" — lighter than a Like, skips the
-- first-line anxiety. One-way signal; the recipient sees it in Messages
-- and can say hi. One wave per pair (no spam).

create table public.waves (
  id bigint generated always as identity primary key,
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);

alter table public.waves enable row level security;
create policy "Waves are visible to the two parties"
  on public.waves for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "Send a wave"
  on public.waves for insert with check (sender_id = auth.uid());
