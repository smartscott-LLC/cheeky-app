-- CLUB ANNOUNCEMENTS (the anonymous overhead ticker, in-app only)
-- Used by the events page and Stream webhook for gift/horn announcements.
create table if not exists public.club_announcements (
  id bigint generated always as identity primary key,
  body text not null,
  kind text not null default 'gift',
  created_at timestamptz not null default now()
);

alter table public.club_announcements enable row level security;
create policy "Club announcements are public"
  on public.club_announcements for select using (true);
