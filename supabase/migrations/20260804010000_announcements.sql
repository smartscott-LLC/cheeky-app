-- Announcements — the marquee beneath each floor's name. Posted from the
-- Lions Den (owner panel), read publicly. display_style picks the animation:
-- scroll (ticker right→left), roll (rolls up from the bottom), fade (fades in).
create table public.announcements (
  id bigint generated always as identity primary key,
  message text not null,
  display_style text not null default 'scroll'
    check (display_style in ('scroll', 'roll', 'fade')),
  link text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
-- Announcements are public — any visitor on the street or a floor can read.
create policy "Announcements are public" on public.announcements
  for select using (true);
-- Writes are service-role only (the owner panel) — no insert/update policies.
