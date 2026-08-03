# PostHog Data Warehouse — Setup Report

## Summary

Four data sources were detected in this project. Credential collection was declined, so all sources require manual setup in the PostHog app via the links below.

---

## Sources Detected

| Source | Kind | Status |
|--------|------|--------|
| PostgreSQL / Supabase | Postgres | Needs browser setup |
| Stripe | Stripe | Needs browser setup |
| Sentry | Sentry | Needs browser setup |

---

## Sources — Browser Setup Required

### 1. Supabase (connected as Postgres)

Both `postgres` (package) and `@supabase/supabase-js` are in `package.json`. Supabase is Postgres under the hood — connect it as a single **Postgres** source.

**Open this URL to finish setup:**
https://us.posthog.com/project/539806/data-warehouse/new-source?kind=Postgres&utm_source=wizard&utm_campaign=warehouse-source

**Critical setup notes before filling the form:**

- **Use the Session pooler**, not the direct host. The direct Supabase host is IPv6-only and PostHog egresses over IPv4 — use the pooler.
  - Pooler host: `aws-0-<region>.pooler.supabase.com` (find in Supabase → Settings → Database → Connection pooling)
  - Port: **6543** (not 5432)
  - Username: **`postgres.<your-project-ref>`** (e.g. `postgres.abcdefghijklmnop`)
- **Password**: Use the **database** password (Supabase → Settings → Database), NOT your `anon` key or `service_role` JWT.
- **Allowlist PostHog IPs** in Supabase → Settings → Network Restrictions (if enabled):
  - US: `44.205.89.55`, `52.4.194.122`, `44.208.188.173`

### 2. Stripe

**Open this URL to finish setup:**
https://us.posthog.com/project/539806/data-warehouse/new-source?kind=Stripe&utm_source=wizard&utm_campaign=warehouse-source

**Critical setup notes:**

- A `STRIPE_SECRET_KEY` (`sk_live_...`) exists in `.env.local` — do **not** use it here. PostHog requires a **restricted key** (`rk_live_...`).
- Create a restricted key at: Stripe Dashboard → Developers → API keys → Restricted keys → Create restricted key
  - Give **Read** on: Core (Balance transaction sources, Charges and refunds, Customers, Disputes, Payment methods, Payouts, Products), Billing (Coupons, Credit notes, Invoices, Prices, Subscriptions), Connect
  - Give **Write** on: Webhooks (lets PostHog auto-create the real-time webhook sync)
- After connecting, enable **webhook sync** in the source's Webhook tab for real-time, change-aware syncing (strongly recommended over append-only or full refresh).

### 3. Sentry

**Open this URL to finish setup:**
https://us.posthog.com/project/539806/data-warehouse/new-source?kind=Sentry&utm_source=wizard&utm_campaign=warehouse-source

**Critical setup notes:**

- A `SENTRY_AUTH_TOKEN` exists in `.env.local` (used for source maps/releases) — it may lack the required read scopes for the data warehouse.
- Create a dedicated **internal integration** token at: Sentry → Settings → [Your Org] → Developer Settings → Internal Integrations → New Integration → Add Token
- Required token scopes: `alerts:read`, `event:read`, `member:read`, `org:integrations`, `org:read`, `project:read`, `team:read`
- You will also need your **organization slug** (the part after `sentry.io/organizations/` in your URL)
- API base URL defaults to `https://sentry.io`; choose `https://us.sentry.io` or `https://de.sentry.io` if your org is on a regional host.

---

## Files Changed

No project source files were modified. This skill only connects external data sources to PostHog — it does not edit application code.

---

## Next Steps

1. Open each browser URL above and complete the form with the credentials described.
2. For **Stripe**, enable webhook sync immediately after connecting for real-time accuracy.
3. Once sources are syncing, visit [PostHog Data Warehouse](https://us.posthog.com/project/539806/data-warehouse) to query your data alongside product analytics.
