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
  verification_attempts int not null default 0,
  verification_escalated_at timestamptz,
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

-- Browse & match (mirrors supabase/migrations/20260801170946_browse_match.sql)
create table likes (
  id bigint generated always as identity primary key,
  liker_id uuid references auth.users on delete cascade not null,
  likee_id uuid references auth.users on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (liker_id, likee_id),
  check (liker_id <> likee_id)
);
alter table likes enable row level security;
create policy "Read likes you sent or received" on likes for select
  using (liker_id = auth.uid() or likee_id = auth.uid());

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid references auth.users on delete cascade not null,
  user_id_b uuid references auth.users on delete cascade not null,
  source text not null default 'browse',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  check (user_id_a < user_id_b),
  unique (user_id_a, user_id_b)
);
alter table matches enable row level security;
create policy "Read matches you are part of" on matches for select
  using (user_id_a = auth.uid() or user_id_b = auth.uid());

create or replace function create_like(p_likee uuid)
returns table (match_id uuid)
language plpgsql security definer
set search_path = public
as $$
declare
  v_liker uuid := auth.uid();
  v_match uuid;
begin
  if v_liker is null then raise exception 'not_authenticated'; end if;
  if v_liker = p_likee then raise exception 'cannot_like_self'; end if;
  insert into likes (liker_id, likee_id) values (v_liker, p_likee)
  on conflict (liker_id, likee_id) do nothing;
  if exists (select 1 from likes where liker_id = p_likee and likee_id = v_liker) then
    insert into matches (user_id_a, user_id_b, source)
    values (least(v_liker, p_likee), greatest(v_liker, p_likee), 'browse')
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_match;
  end if;
  return query select v_match;
end;
$$;
grant execute on function create_like(uuid) to authenticated;

-- Chat & messaging (mirrors supabase/migrations/20260801172133_chat_messaging.sql)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid references auth.users on delete cascade not null,
  user_id_b uuid references auth.users on delete cascade not null,
  created_at timestamptz not null default now(),
  check (user_id_a < user_id_b),
  unique (user_id_a, user_id_b)
);
alter table conversations enable row level security;
create policy "Read your conversations" on conversations for select
  using (user_id_a = auth.uid() or user_id_b = auth.uid());

create table messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references conversations on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table messages enable row level security;
create policy "Read messages in your conversations" on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.user_id_a = auth.uid() or c.user_id_b = auth.uid())
  ));

create table blocks (
  id bigint generated always as identity primary key,
  blocker_id uuid references auth.users on delete cascade not null,
  blocked_id uuid references auth.users on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table blocks enable row level security;
create policy "Read your blocks" on blocks for select using (blocker_id = auth.uid());
create policy "Block someone" on blocks for insert with check (blocker_id = auth.uid());

create table reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users on delete cascade not null,
  reported_id uuid references auth.users on delete cascade not null,
  reason text not null,
  context text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed')),
  outcome text
    check (outcome is null or outcome in ('action_taken', 'suspended', 'no_action')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
create policy "File a report" on reports for insert with check (reporter_id = auth.uid());

create or replace function get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_conv uuid;
begin
  if v_sender is null then raise exception 'not_authenticated'; end if;
  if v_sender = p_other then raise exception 'cannot_message_self'; end if;
  select id into v_conv from conversations
  where user_id_a = least(v_sender, p_other) and user_id_b = greatest(v_sender, p_other);
  if v_conv is null then
    insert into conversations (user_id_a, user_id_b)
    values (least(v_sender, p_other), greatest(v_sender, p_other))
    on conflict (user_id_a, user_id_b) do nothing
    returning id into v_conv;
    if v_conv is null then
      select id into v_conv from conversations
      where user_id_a = least(v_sender, p_other) and user_id_b = greatest(v_sender, p_other);
    end if;
  end if;
  return v_conv;
end;
$$;
grant execute on function get_or_create_conversation(uuid) to authenticated;

create or replace function send_message(p_conversation_id uuid, p_body text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_other uuid;
  v_tier text;
  v_msg_limit int;
  v_people_limit int;
  v_msg_today int;
  v_people_today int;
  v_matched boolean;
  v_msg bigint;
begin
  if v_sender is null then raise exception 'not_authenticated'; end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then raise exception 'invalid_message_length'; end if;
  select case when user_id_a = v_sender then user_id_b else user_id_a end into v_other
  from conversations where id = p_conversation_id;
  if v_other is null then raise exception 'not_a_participant'; end if;
  if exists (select 1 from blocks
             where (blocker_id = v_sender and blocked_id = v_other)
                or (blocker_id = v_other and blocked_id = v_sender)) then
    raise exception 'blocked';
  end if;
  select coalesce(p.name, 'Standard Membership') into v_tier
  from subscriptions s
  join prices pr on pr.id = s.price_id
  join products p on p.id = pr.product_id
  where s.user_id = v_sender and s.status in ('active', 'trialing')
  order by s.created_at desc limit 1;
  v_msg_limit := case v_tier when 'Gold Membership' then 75 else 30 end;
  v_people_limit := case v_tier
    when 'Gold Membership' then 15
    when 'Platinum Membership' then 40
    when 'Diamond Club' then 100
    else 5 end;
  select count(*) into v_msg_today from messages m
  where m.sender_id = v_sender and m.created_at >= date_trunc('day', now());
  if v_msg_today >= v_msg_limit then raise exception 'daily_message_limit'; end if;
  select exists (select 1 from matches
                 where user_id_a = least(v_sender, v_other)
                   and user_id_b = greatest(v_sender, v_other)
                   and status = 'active') into v_matched;
  if not v_matched then
    select count(distinct case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
      into v_people_today
    from messages m join conversations c on c.id = m.conversation_id
    where m.sender_id = v_sender
      and m.created_at >= date_trunc('day', now())
      and not exists (select 1 from matches mt
        where mt.user_id_a = least(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end)
          and mt.user_id_b = greatest(v_sender, case when c.user_id_a = v_sender then c.user_id_b else c.user_id_a end));
    if v_people_today >= v_people_limit then raise exception 'daily_people_limit'; end if;
  end if;
  insert into messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_sender, p_body)
  returning id into v_msg;
  return v_msg;
end;
$$;
grant execute on function send_message(uuid, text) to authenticated;

-- Profile photos (mirrors supabase/migrations/20260801173355_profile_photos.sql)
create or replace function enforce_photo_limit()
returns trigger as $$
declare v_count int;
begin
  select count(*) into v_count from photos where user_id = new.user_id;
  if v_count >= 3 then raise exception 'photo_limit_reached'; end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger photos_limit_before_insert
  before insert on photos
  for each row execute procedure enforce_photo_limit();

create policy "Read profile photos" on storage.objects for select
  using (bucket_id = 'profiles');
create policy "Upload your own profile photos" on storage.objects for insert
  with check (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Update your own profile photos" on storage.objects for update
  using (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Delete your own profile photos" on storage.objects for delete
  using (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);