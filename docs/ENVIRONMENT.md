# Environment Variables

Every variable the app or its scripts read, what it does, and whether it's
public. Source of truth for values: **`.env.new`** (the founder's gitignored
vault) and, on Ivy, `~/club.env` → k8s Secrets (see `docs/IVY-BUILD-FLOW.md`).
Updated 2026-10-27 to the Square + Didit reality.

Legend: **public** = ships in the client bundle · **secret** = server-only, never commit.

## Core

| Variable                                                | Public | Used for                                                                                                                |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                  | public | Canonical site URL (emails, metadata, `getURL()`). **Missing = broken email links — the app fails loud.**               |
| `NEXT_PUBLIC_COOKIE_DOMAIN`                             | public | Dot-domain (`.smartscott.online`) that lets the session cookie span club ↔ maker. **Baked at BUILD time, both images.** |
| `NEXT_PUBLIC_SUPABASE_URL`                              | public | Supabase project URL (`https://<ref>.supabase.co`)                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `..._PUBLISHABLE_KEY` | public | Client auth/DB access (anon role) — `utils/supabase/keys.ts` accepts both names                                         |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`     | secret | Server-only writes (webhooks, RPCs, admin). Never in client code.                                                       |
| `SUPABASE_JWT_SECRET`                                   | secret | Legacy token context — currently UNUSED by code; kept as a vault curiosity. Candidate for deletion.                     |

## Hosted Postgres (dev scripts + live tests + backups — not app runtime)

| Variable                                       | Used for                                                    |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `POSTGRES_URL`                                 | pgbouncer **pooler** (6543) — stress tests, pg_dump backups |
| `POSTGRES_URL_NON_POOLING` / `POSTGRES_HOST` … | direct (5432) — `migrate-hosted`, `generate-types`          |

## Square (the register)

| Variable                       | Public | Used for                                                                                |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------- |
| `SQUARE_ACCESS_TOKEN`          | secret | Order retrieval in the webhook (production token; sandbox variant prefixed differently) |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | secret | HMAC verify of `POST /api/webhooks/square` (URL+timestamp scheme)                       |
| `SQUARE_WEBHOOK_URL`           | secret | The exact URL Square signs — must match the destination registered in Square's console  |
| `SQUARE_SUBSCRIPTION_ID`       | secret | Catalog/subscription scoping for order lookup paths                                     |

Contract: item SKUs ↔ grants defined by `ITEM_LIBRARY.csv`, mirrored in
`utils/square-webhook.ts`. Storefront links: `utils/square-links.ts`.

## Didit (the door's KYC)

| Variable               | Public | Used for                                                          |
| ---------------------- | ------ | ----------------------------------------------------------------- |
| `DIDIT_API_KEY`        | secret | Session create (`utils/didit.ts`) — workflow `DIDIT_WORKFLOW_ID`  |
| `DIDIT_WEBHOOK_SECRET` | secret | Canonicalised HMAC-SHA256 (X-Signature-V2) verification           |
| `DIDIT_WORKFLOW_ID`    | secret | The live workflow (`e53ce2d4…` "Fast ID check" — env-overridable) |

> ⚠️ Didit charges per verification. **Never test-spam** — one live check, founder-approved.

## The crew (AI)

| Variable                                        | Public | Used for                                                                                                                |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `AI_MODEL` / `MODEL_BASE_URL` / `MODEL_API_KEY` | secret | `/api/agent` + bio-draft — direct REST to the Agnes hub (no provider SDK; the old Vercel-gateway path is fallback only) |
| `OPENROUTER_API_KEY`                            | secret | **DateSafe** — report image-review watchdog (`utils/datesafe.ts`)                                                       |
| `DATESAFE_VISION_MODEL`                         | secret | Watchdog model override                                                                                                 |
| `MEMORY_MEM0_*` (4 vars)                        | secret | Concierge long-term memory (mem0 platform)                                                                              |
| `STREAMCHAT_ID/API_KEY/SECRET_KEY`              | secret | Cheeky Chats (Stream SDK server-side tokens)                                                                            |

> Rotated-key history: the OpenRouter key leaked into a chat transcript 2026-10-07 and was
> rotated the same day — treat that transcript's value as dead.

## Mail (Resend)

| Variable            | Public | Used for                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------ |
| `RESEND_API_KEY`    | secret | Welcome, verification confirmations, apology, ban notices, door messages |
| `REGISTERED_DOMAIN` | secret | The sending domain (`smartscott.online`)                                 |

## Owner / misc

| Variable                            | Public | Used for                                                                |
| ----------------------------------- | ------ | ----------------------------------------------------------------------- |
| `OWNER_USERNAME` / `OWNER_PASSWORD` | secret | The founder's account bootstrap                                         |
| `ADMIN_KEY`                         | secret | Legacy fallback for the `/owner` booth (owner-account check is primary) |

`CLOUDFARE_*` / `COMPOSIO_API_KEY` live in the vault for **ops tooling**
(Cloudflare API, Composio skills, R2 backup attempts) — no app code reads them.

## Where the values live

- **`.env.new`** — THE master vault (gitignored). Scripts and live tests read
  it directly (`config({ path: '.env.new' })`). Edit here, never anywhere else.
- **Ivy** — `~/club.env` (600) derived from `.env.new` → k8s Secret
  (`club-env`, `maker-env`, `lounge-env`, `forms-env`) via
  `kubectl create secret --from-env-file`. `NEXT_PUBLIC_*` additionally get
  **baked into images at build time** by `scripts/ivy-build` (Next inlines
  them — runtime-only would silently no-op). Refresh: sed the env file →
  recreate Secret → `rollout restart`.
- **Vercel** — paused/rollback ghost. No new env work happens there.
- **Never** commit any of this; secrets never appear in chat or logs.
