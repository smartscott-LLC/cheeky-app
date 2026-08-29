/**
* USERS — idempotent re-run guard. The Stripe template seeded this table
* when the project was created; we use IF NOT EXISTS so `supabase db push`
* doesn't blow up when the DB already has it.
*/
create table if not exists users (
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
-- Policies are idempotent: drop then create so they land cleanly on re-push.
drop policy if exists "Can view own user data." on users;
create policy "Can view own user data." on users for select using (auth.uid() = id);
drop policy if exists "Can update own user data." on users;
create policy "Can update own user data." on users for update using (auth.uid() = id);

/**
* This trigger automatically creates a user entry when a new user signs up via Supabase Auth.
*/
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;
-- Drop then recreate the trigger so re-runs are safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

/**
* CUSTOMERS — private mapping of user IDs to Stripe customer IDs.
*/
create table if not exists customers (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  -- The user's customer ID in Stripe. User must not be able to update this.
  stripe_customer_id text
);
alter table customers enable row level security;
-- No policies as this is a private table that the user must not have access to.

/**
* PRODUCTS — synced from Stripe via webhooks.
*/
create table if not exists products (
  -- Product ID from Stripe, e.g. prod_1234.
  id text primary key,
  -- Whether the product is currently available for purchase.
  active boolean,
  -- The product's name, meant to be displayable to the customer.
  name text,
  -- The product's description, meant to be displayable to the customer.
  description text,
  -- A URL of the product image in Stripe, meant to be displayable to the customer.
  image text,
  -- Set of key-value pairs, used to store additional information about the object.
  metadata jsonb
);
alter table products enable row level security;
drop policy if exists "Allow public read-only access." on products;
create policy "Allow public read-only access." on products for select using (true);

/**
* PRICES — synced from Stripe via webhooks.
*/
-- PostgreSQL has no "IF NOT EXISTS" for types, so drop/recreate idempotently.
drop type if exists pricing_type cascade;
create type pricing_type as enum ('one_time', 'recurring');
drop type if exists pricing_plan_interval cascade;
create type pricing_plan_interval as enum ('day', 'week', 'month', 'year');
create table if not exists prices (
  -- Price ID from Stripe, e.g. price_1234.
  id text primary key,
  -- The ID of the product that this price belongs to.
  product_id text references products,
  -- Whether the price can be used for new purchases.
  active boolean,
  -- A brief description of the price.
  description text,
  -- The unit amount as a positive integer in the smallest currency unit.
  unit_amount bigint,
  -- Three-letter ISO currency code, in lowercase.
  currency text check (char_length(currency) = 3),
  -- One of `one_time` or `recurring`.
  type pricing_type,
  -- The frequency at which a subscription is billed.
  interval pricing_plan_interval,
  -- Number of intervals between subscription billings.
  interval_count integer,
  -- Default number of trial days.
  trial_period_days integer,
  -- Set of key-value pairs, used to store additional information.
  metadata jsonb
);
alter table prices enable row level security;
drop policy if exists "Allow public read-only access." on prices;
create policy "Allow public read-only access." on prices for select using (true);

/**
* SUBSCRIPTIONS — synced from Stripe via webhooks.
*/
drop type if exists subscription_status cascade;
create type subscription_status as enum ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');
create table if not exists subscriptions (
  -- Subscription ID from Stripe, e.g. sub_1234.
  id text primary key,
  user_id uuid references auth.users not null,
  -- The status of the subscription object.
  status subscription_status,
  -- Set of key-value pairs, used to store additional information.
  metadata jsonb,
  -- ID of the price that created this subscription.
  price_id text references prices,
  -- Quantity multiplied by the unit amount of the price.
  quantity integer,
  -- If true the subscription has been canceled by the user.
  cancel_at_period_end boolean,
  -- Time at which the subscription was created.
  created timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Start of the current period that the subscription has been invoiced for.
  current_period_start timestamp with time zone default timezone('utc'::text, now()) not null,
  -- End of the current period that the subscription has been invoiced for.
  current_period_end timestamp with time zone default timezone('utc'::text, now()) not null,
  -- If the subscription has ended.
  ended_at timestamp with time zone default timezone('utc'::text, now()),
  -- A date in the future at which the subscription will automatically get canceled.
  cancel_at timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has been canceled, the date of that cancellation.
  canceled_at timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has a trial, the beginning of that trial.
  trial_start timestamp with time zone default timezone('utc'::text, now()),
  -- If the subscription has a trial, the end of that trial.
  trial_end timestamp with time zone default timezone('utc'::text, now())
);
alter table subscriptions enable row level security;
drop policy if exists "Can only view own subs data." on subscriptions;
create policy "Can only view own subs data." on subscriptions for select using (auth.uid() = user_id);

/**
 * REALTIME SUBSCRIPTIONS
 * Only allow realtime listening on public tables.
 */
drop publication if exists supabase_realtime;
create publication supabase_realtime for table products, prices;
