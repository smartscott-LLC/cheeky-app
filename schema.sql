/** 
* USERS
* Note: This table contains user data. Users should only be able to view and update their own data.
*/
create table users (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  -- The customer's billing address, stored in JSON format.
  billing_address jsonb,
  -- Stores your customer's payment instruments.
  payment_method jsonb
);
alter table users enable row level security;
create policy "Can view own user data." on users for select using (auth.uid() = id);
create policy "Can update own user data." on users for update using (auth.uid() = id);

/**
* This trigger automatically creates a user entry when a new user signs up via Supabase Auth.
*/ 
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

/**
* CUSTOMERS
* Note: this is a private table that contains a mapping of user IDs to Stripe customer IDs.
*/
create table customers (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  -- The user's customer ID in Stripe. User must not be able to update this.
  stripe_customer_id text
);
alter table customers enable row level security;
-- No policies as this is a private table that the user must not have access to.

/** 
* PRODUCTS
* Note: products are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
create table products (
  -- Product ID from Stripe, e.g. prod_1234.
  id text primary key,
  -- Whether the product is currently available for purchase.
  active boolean,
  -- The product's name, meant to be displayable to the customer. Whenever this product is sold via a subscription, name will show up on associated invoice line item descriptions.
  name text,
  -- The product's description, meant to be displayable to the customer. Use this field to optionally store a long form explanation of the product being sold for your own rendering purposes.
  description text,
  -- A URL of the product image in Stripe, meant to be displayable to the customer.
  image text,
  -- Set of key-value pairs, used to store additional information about the object in a structured format.
  metadata jsonb
);
alter table products enable row level security;
create policy "Allow public read-only access." on products for select using (true);

/**
* PRICES
* Note: prices are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
create type pricing_type as enum ('one_time', 'recurring');
create type pricing_plan_interval as enum ('day', 'week', 'month', 'year');
create table prices (
  -- Price ID from Stripe, e.g. price_1234.
  id text primary key,
  -- The ID of the prduct that this price belongs to.
  product_id text references products, 
  -- Whether the price can be used for new purchases.
  active boolean,
  -- A brief description of the price.
  description text,
  -- The unit amount as a positive integer in the smallest currency unit (e.g., 100 cents for US$1.00 or 100 for ¥100, a zero-decimal currency).
  unit_amount bigint,
  -- Three-letter ISO currency code, in lowercase.
  currency text check (char_length(currency) = 3),
  -- One of `one_time` or `recurring` depending on whether the price is for a one-time purchase or a recurring (subscription) purchase.
  type pricing_type,
  -- The frequency at which a subscription is billed. One of `day`, `week`, `month` or `year`.
  interval pricing_plan_interval,
  -- The number of intervals (specified in the `interval` attribute) between subscription billings. For example, `interval=month` and `interval_count=3` bills every 3 months.
  interval_count integer,
  -- Default number of trial days when subscribing a customer to this price using [`trial_from_plan=true`](https://stripe.com/docs/api#create_subscription-trial_from_plan).
  trial_period_days integer,
  -- Set of key-value pairs, used to store additional information about the object in a structured format.
  metadata jsonb
);
alter table prices enable row level security;
create policy "Allow public read-only access." on prices for select using (true);

/**
* SUBSCRIPTIONS
* Note: subscriptions are created and managed in Stripe and synced to our DB via Stripe webhooks.
*/
create type subscription_status as enum ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');
create table subscriptions (
  -- Subscription ID from Stripe, e.g. sub_1234.
  id text primary key,
  user_id uuid references auth.users not null,
  -- The status of the subscription object, one of subscription_status type above.
  status subscription_status,
  -- Set of key-value pairs, used to store additional information about the object in a structured format.
  metadata jsonb,
  -- ID of the price that created this subscription.
  price_id text references prices,
  -- Quantity multiplied by the unit amount of the price creates the amount of the subscription. Can be used to charge multiple seats.
  quantity integer,
  -- If true the subscription has been canceled by the user and will be deleted at the end of the billing period.
  cancel_at_period_end boolean,
  -- Time at which the subscription was created.
  created timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Start of the current period that the subscription has been invoiced for.
  current_period_start timestamp with time zone default timezone('utc'::text, now()) not null,
  -- End of the current period that the subscription has been invoiced for. At the end of this period, a new invoice will be created.
  current_period_end timestamp with time zone default timezone('utc'::text, now()) not null,
  -- If the subscription has ended, the timestamp of the date the subscription ended.
  ended_at timestamp with time zone default timezone('utc'::text, now()),
  -- A date in the future at which the subscription will automatically get canceled.
  cancel_at timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has been canceled, the date of that cancellation. If the subscription was canceled with `cancel_at_period_end`, `canceled_at` will still reflect the date of the initial cancellation request, not the end of the subscription period when the subscription is automatically moved to a canceled state.
  canceled_at timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has a trial, the beginning of that trial.
  trial_start timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has a trial, the end of that trial.
  trial_end timestamp with time zone default timezone('utc'::text, now())
);
alter table subscriptions enable row level security;
create policy "Can only view own subs data." on subscriptions for select using (auth.uid() = user_id);

/**
 * REALTIME SUBSCRIPTIONS
 * Only allow realtime listening on public tables.
 */
drop publication if exists supabase_realtime;
create publication supabase_realtime for table products, prices;

/**
 * PHASE 1A — CLUB FLOOR (mirrors supabase/migrations/20260801033036_phase1_club_floor.sql)
 * Governance-driven: PII split from public profile data, consent traceability.
 */

-- Public profile (profiles are the product)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text not null default '',
  bio text not null default '',
  message_retention_days smallint not null default 90
    check (message_retention_days between 3 and 90),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "Profiles are readable by everyone" on profiles for select using (true);
create policy "Users create their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update their own profile" on profiles for update using (auth.uid() = id);

-- Private PII (birthday, verification trace) — owner only
create table profile_private (
  id uuid references auth.users on delete cascade not null primary key,
  birthday date,
  verification_provider text,
  verification_ref text,
  updated_at timestamptz not null default now()
);
alter table profile_private enable row level security;
create policy "Users read their own private profile" on profile_private for select using (auth.uid() = id);
create policy "Users update their own private profile" on profile_private for update using (auth.uid() = id);

-- Consents (governance traceability)
create type consent_type as enum ('terms', 'privacy', 'verification');
create table consents (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  consent_type consent_type not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, consent_type)
);
alter table consents enable row level security;
create policy "Users read their own consents" on consents for select using (auth.uid() = user_id);
create policy "Users record their own consents" on consents for insert with check (auth.uid() = user_id);

-- Photos (post limit 3 for Silver/below, view limit 3 for Silver/below — app-enforced)
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  storage_path text not null,
  position smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
alter table photos enable row level security;
create policy "Photos are readable by everyone" on photos for select using (true);
create policy "Users add their own photos" on photos for insert with check (auth.uid() = user_id);
create policy "Users update their own photos" on photos for update using (auth.uid() = user_id);
create policy "Users delete their own photos" on photos for delete using (auth.uid() = user_id);

-- Token ledger (server-side money; writes via service role only — no insert policy)
create table token_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  delta integer not null check (delta <> 0),
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
alter table token_ledger enable row level security;
create policy "Users read their own token ledger" on token_ledger for select using (auth.uid() = user_id);

-- Profile photos storage bucket (public — photos are the product)
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- updated_at keeper
create function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- Auto-create profile rows on signup (birthday, retention, consents via raw_user_meta_data)
create or replace function handle_new_profile()
returns trigger as $$
declare
  bday date := nullif(new.raw_user_meta_data->>'birthday', '')::date;
  retention int := nullif(new.raw_user_meta_data->>'message_retention_days', '')::int;
  terms_v text := new.raw_user_meta_data->>'terms_version';
  privacy_v text := new.raw_user_meta_data->>'privacy_version';
begin
  insert into profiles (id, message_retention_days)
  values (new.id, coalesce(greatest(3, least(90, retention)), 90))
  on conflict (id) do nothing;

  insert into profile_private (id, birthday)
  values (new.id, bday)
  on conflict (id) do nothing;

  if terms_v is not null then
    insert into consents (user_id, consent_type, version)
    values (new.id, 'terms', terms_v)
    on conflict (user_id, consent_type) do nothing;
  end if;

  if privacy_v is not null then
    insert into consents (user_id, consent_type, version)
    values (new.id, 'privacy', privacy_v)
    on conflict (user_id, consent_type) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure handle_new_profile();