the route at post-hawed warehouse report MD. So, you know, if we want, we can reread that to see just how it did make sure that it connected to all those. The only one I think it was having trouble with was stripe because it asked for one and I thought it was worth a different. So I gave it, 'cause it just didn't make sense what it was asking for. So, you know, 'cause it asked for a different thing. It actually means the way it actually, it, where they actually are, but I think for the most part I got to figure it out, but that one was taking a minute. So I think, let's see, this report post-hawed report. can make good sources, let me see strike. Source time Okay, so it did Ford data sources were detected in this project one was connected successfully VSCOI and three required distal action described so Stripe was actually the only one that did get connected So I was completely wrong on that But whatever we'll connect them I know you know how that's that's my update# PostHog Data Warehouse Setup Report

## Summary

Four data sources were detected in this project. One was connected successfully via the CLI, and three require additional action described below.

---

## Connected Sources

### Stripe ✅

- **Source type:** Stripe (API key auth)
- **Source ID:** `019fc8f2-cdf0-0000-988a-e55908cf79dd`
- **Tables synced (append mode):**
  - Customer
  - Charge
  - Invoice
  - Subscription
  - Product
  - Price
  - PaymentIntent
  - Refund
- **Sync method:** Append-only (incremental by `created_at`)
- **Status:** Created and syncing

> **Recommended next step:** Set up webhook syncing for real-time updates. Go to [your Stripe source in PostHog](https://us.posthog.com/project/540822/data-warehouse) → click the Stripe source → Webhook tab → Create webhook. Webhook sync is the only mode that captures updates and deletes to existing rows (e.g. subscription cancellations, refund status changes). This requires Webhooks Write permission on your Stripe key.

> **Security note:** A full secret key (`sk_live_...`) was used. For least-privilege access, consider replacing it with a restricted key (`rk_live_...`) via Stripe → Developers → API keys → Restricted keys.

---

## Sources Requiring Browser Setup

### Supabase / PostgreSQL

- **Reason:** User declined to provide session pooler credentials in the CLI.
- **Setup URL:** [Connect Supabase as Postgres in PostHog](https://us.posthog.com/project/540822/data-warehouse/new-source?kind=Postgres&utm_source=wizard&utm_campaign=warehouse-source)
- **Instructions:**
  1. Open the URL above.
  2. Enter your **Session Pooler** connection details — NOT the direct host (the direct host is IPv6-only and unreachable from PostHog).
  3. Session pooler host: `aws-0-<region>.pooler.supabase.com` (Supabase → Settings → Database → Connection Pooling)
  4. Port: **6543**
  5. Username: **`postgres.<your-project-ref>`**
  6. Password: your **database password** (Supabase → Settings → Database) — NOT the anon/service_role JWT key
  7. Allow PostHog's egress IPs in your Supabase network settings:
     - `44.205.89.55`, `52.4.194.122`, `44.208.188.173`

### Sentry

- **Reason:** The provided token was missing required scopes. The token must be a Sentry Internal Integration token with: `alerts:read`, `event:read`, `member:read`, `org:integrations`, `org:read`, `project:read`, `team:read`.
- **Setup URL:** [Connect Sentry in PostHog](https://us.posthog.com/project/540822/data-warehouse/new-source?kind=Sentry&utm_source=wizard&utm_campaign=warehouse-source)
- **Instructions:**
  1. In Sentry, go to **Settings → Developer Settings → Internal Integrations → New Internal Integration**.
  2. Grant all required scopes listed above.
  3. Copy the generated token.
  4. Open the URL above and paste the token along with your org slug (`smartscott`) and select the US datacenter (`https://us.sentry.io`).

---

## Files Modified or Created

| File                          | Change              |
| ----------------------------- | ------------------- |
| `posthog-warehouse-report.md` | Created (this file) |

No application source files were modified. This skill only configures external data connections in PostHog.

---

## Manual Steps Summary

1. **Stripe webhooks** — Set up webhook sync in the PostHog UI for real-time Stripe data (see Stripe section above).
2. **Supabase/Postgres** — Complete connection via the browser link above using session pooler credentials.
3. **Sentry** — Create a new Internal Integration token with required scopes and complete setup via the browser link above.
