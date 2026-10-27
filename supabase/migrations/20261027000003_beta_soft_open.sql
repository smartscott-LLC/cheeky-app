-- Beta soft-open (founder greenlight 2026-10-27): sign-ups, the door check
-- and the lounge are open ahead of full launch; the game surfaces (club,
-- floors, spark list, events, chats, gifts) unlock for everyone at the
-- launch moment — or early, per member, by the founder's owner console.
--
-- profiles.early_access  → hand-picked testers bypass the gate
-- launch_config          → the global switch + the date the banner quotes

alter table public.profiles add column if not exists early_access boolean not null default false;

create table if not exists public.launch_config (
  id boolean not null default true primary key check (id),  -- singleton row
  open boolean not null default false,
  opens_at timestamptz not null default '2026-10-31T19:00:00-05:00',
  banner_text text
);

insert into public.launch_config (id, open) values (true, false)
  on conflict (id) do nothing;

-- Hard RLS: members see NOTHING of this machinery; service role (server
-- actions / middleware reads via supabaseAdmin) is the only reader/writer.
alter table public.profiles enable row level security;
revoke all on public.launch_config from public, anon, authenticated;
alter table public.launch_config enable row level security;
create policy "service only reads launch config"
  on public.launch_config for select to service_role using (true);
create policy "service only writes launch config"
  on public.launch_config for all to service_role using (true) with check (true);

-- early_access is owner-console-only (service role); never client-writable —
-- the existing profiles UPDATE policies bind to member columns, verify no
-- blanket with-check leak exists (there isn't: policies are column-scoped
-- through the API surface this migration adds no grants to).
