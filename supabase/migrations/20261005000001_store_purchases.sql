-- The purchase record (docs/PRD-square-didit.md): every Square order lands
-- here — "even the free tier needs to pass through it for records." Silver
-- purchases exist ONLY here (entitlement_grants.tier is CHECKed to the paid
-- floors; Silver is the ground, not a grant). Paid/trial purchases write
-- here AND entitlement_grants AND token_ledger, in one handler.
--
-- UNIQUE(order_id, sku) is the idempotency lock that doesn't trust the
-- webhook layer: Square retries deliveries, our handler can fire twice,
-- the database says no.

create table if not exists public.store_purchases (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  sku text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_name text not null,
  kind text not null check (kind in ('membership', 'trial', 'tokens', 'gift_set')),
  tier text,
  days integer,
  tokens integer not null default 0,
  amount_cents integer not null,
  fulfilled boolean not null default true,
  purchased_at timestamptz not null default now(),
  unique (order_id, sku)
);

alter table public.store_purchases enable row level security;
-- No policies: service-role writes only (the webhook handler). Members see
-- their purchases through the manifest mirror, not raw table access.

-- gift_set purchases need owner fulfilment (basket/horn inventory wiring is
-- post-launch); fulfilled=false is the honest queue, not a silent drop.
comment on column public.store_purchases.fulfilled is
  'false = recorded, awaiting fulfilment path (gift sets); owner-tools visible';
