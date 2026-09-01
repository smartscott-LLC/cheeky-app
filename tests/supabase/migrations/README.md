Webhook idempotency migration (20260802152000_webhook_idempotency.sql)

Purpose:

- Adds public.webhook_events table to record processed Stripe events and avoid duplicate processing.
- RLS is enabled and client reads/writes are denied; only server/service-role access should insert records.

How to apply:

- Run migrations using your normal supabase deployment flow (CI or local). Examples:
  - Locally: `pnpm supabase:start` then `pnpm supabase:push` (requires pnpm and Supabase CLI installed and configured)
  - CI: run `supabase db push` or apply the SQL directly using `psql` with the service role DB connection string.

Important:

- This migration must be applied using a service-role key or DB credentials that have permission to create tables and bypass RLS.
- Do not expose the service role key in logs or public CI outputs. Use secrets management.

Testing:

- After applying, send a real or test Stripe webhook to the app endpoint. The app will insert a record into webhook_events for the event id. Subsequent replays of the same event id should be acknowledged but not re-processed.
