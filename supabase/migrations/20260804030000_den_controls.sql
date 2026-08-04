-- Den emergency controls (2026-08-04):
--  1) model_config — swap the cast + watchdog models without a redeploy.
--     Read at request time by the agent route and DateSafe. Keys stay in
--     env (never the DB); this table only holds the model ids.
--  2) floor_closures — put a floor "under construction" from the Den. The
--     floor page and the elevator directory show the notice. until = auto
--     reopen.

create table public.model_config (
  id boolean primary key default true check (id),
  cast_model text not null default 'deepseek-chat',
  watchdog_model text not null default 'nvidia/nemotron-nano-12b-v2-vl:free',
  updated_at timestamptz not null default now()
);
alter table public.model_config enable row level security;
-- service-role only (the Den writes via the owner gate); no client policies.
insert into public.model_config (id) values (true) on conflict (id) do nothing;

create table public.floor_closures (
  floor text primary key check (floor in ('silver', 'gold', 'platinum', 'diamond')),
  reason text,
  until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.floor_closures enable row level security;
-- The notice is public — anyone who opens the elevators can read it.
create policy "Floor closures are public" on public.floor_closures
  for select using (true);
-- Writes are service-role only (the Den) — no insert/update policies.
