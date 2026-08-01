-- Phase 1A — Club Floor: profiles, consents, photos, token ledger
-- Governance-driven (docs/Governance/): 18+ gate, consent traceability,
-- PII split from public profile data, no raw verification material stored.

-- ============================================================
-- PROFILES (public — profiles are the product)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  display_name text not null default '',
  bio text not null default '',
  -- Member-chosen message retention (3..90 days), set at profile creation.
  message_retention_days smallint not null default 90
    check (message_retention_days between 3 and 90),
  -- Verification state (powers the VIP badge). Result + timestamp only.
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are the product: anyone may read public profile fields.
create policy "Profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "Users create their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- PROFILE_PRIVATE (PII — owner only)
-- Birthday is collected for the 18+ gate and never shown publicly.
-- Verification provider/ref trace which Door Check produced the badge.
-- ============================================================
create table public.profile_private (
  id uuid references auth.users(id) on delete cascade not null primary key,
  birthday date,
  verification_provider text,
  verification_ref text,
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

create policy "Users read their own private profile"
  on public.profile_private for select using (auth.uid() = id);
create policy "Users update their own private profile"
  on public.profile_private for update using (auth.uid() = id);

-- ============================================================
-- CONSENTS (governance traceability — what was accepted, when)
-- ============================================================
create type public.consent_type as enum ('terms', 'privacy', 'verification');

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  consent_type public.consent_type not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, consent_type)
);

alter table public.consents enable row level security;

create policy "Users read their own consents"
  on public.consents for select using (auth.uid() = user_id);
create policy "Users record their own consents"
  on public.consents for insert with check (auth.uid() = user_id);

-- ============================================================
-- PHOTOS
-- Post limit: 3 for Guests/Silver, more for paid floors (app-enforced).
-- View limit: 3 for Guests/Silver viewers, more for paid floors
-- (query-enforced). RLS allows read; the tier gating lives in queries.
-- ============================================================
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  position smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Photos are readable by everyone"
  on public.photos for select using (true);
create policy "Users add their own photos"
  on public.photos for insert with check (auth.uid() = user_id);
create policy "Users update their own photos"
  on public.photos for update using (auth.uid() = user_id);
create policy "Users delete their own photos"
  on public.photos for delete using (auth.uid() = user_id);

-- ============================================================
-- TOKEN LEDGER (server-side money — never trusted from the client)
-- deltas: +20 verification bonus, +20 referral, -3 event entry,
-- +3 event refund, giveaways. No insert policy: writes go through
-- server-side code (service role / security definer) only.
-- ============================================================
create table public.token_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  delta integer not null check (delta <> 0),
  reason text not null,
  ref uuid,
  created_at timestamptz not null default now()
);

alter table public.token_ledger enable row level security;

create policy "Users read their own token ledger"
  on public.token_ledger for select using (auth.uid() = user_id);

-- ============================================================
-- PROFILE STORAGE BUCKET (profile photos are the product — public)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- ============================================================
-- TRIGGERS
-- ============================================================
-- Keep updated_at fresh.
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create profile rows on signup. Birthday is passed through
-- raw_user_meta_data by the signup flow and stored privately.
create function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  insert into public.profile_private (id, birthday)
  values (new.id, nullif(new.raw_user_meta_data->>'birthday', '')::date);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_profile();
