-- token_ledger.ref holds external references (e.g. Stripe verification
-- session ids like vs_1Tz...) which are not UUIDs. Widen to text.
alter table public.token_ledger
  alter column ref type text using ref::text;
