# Environment Variables

Every variable the app or its scripts read, what it does, and whether it's public.
Source of truth for values: `env.new` (the founder's gitignored vault) and Vercel.

Legend: **public** = ships in the client bundle (safe to commit / put in CI) ·
**secret** = server-only, never commit.

## Core

| Variable | Public | Used for |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical site URL (emails, metadata, `getURL()`). **Missing in production = broken email links — the app fails loud.** |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Client auth/DB access (anon role only) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Server-only writes (webhooks, RPCs, admin). Never in client code. |
| `SUPABASE_JWT_SECRET` | secret | Server auth helpers (legacy token context) |

Supabase renamed its keys (anon → publishable, service_role → secret); `utils/supabase/keys.ts`
accepts both names, so whatever the dashboard hands out works.

## Hosted Postgres (dev scripts + live tests — not app runtime)

| Variable | Used for |
|---|---|
| `POSTGRES_URL` | pgbouncer **pooler** (6543) — the production connection path; used by the token-engine stress test |
| `POSTGRES_URL_NON_POOLING` | Direct (5432) — `migrate-hosted`, `generate-types` |
| `POSTGRES_HOST` | Hostname reference |

## Stripe

| Variable | Public | Used for |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Embedded checkout |
| `STRIPE_SECRET_KEY` | secret | Server-side Stripe (checkout sessions, webhook retrieve) |
| `STRIPE_WEBHOOK_SECRET` | secret | Webhook signature verification (`whsec_…`). **The CLI's docs may call this a "signing secret" — the app reads exactly `STRIPE_WEBHOOK_SECRET`; a different var name means 400 "Webhook secret not found."** |

## The crew (AI)

| Variable | Public | Used for |
|---|---|---|
| `DEEPSEEK_API_KEY` | secret | `/api/agent` — the cast's chat engine (direct DeepSeek) |
| `DEEPSEEK_MODEL` | secret | Optional override (default `deepseek-chat`) |
| `OPENROUTER_API_KEY` | secret | **DateSafe** — the image-review watchdog (OpenRouter vision model) |
| `DATESAFE_VISION_MODEL` | secret | Optional watchdog model override (default `nvidia/nemotron-nano-12b-v2-vl:free`) |

## Analytics & monitoring

| Variable | Public | Used for |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | public | PostHog project key (`phc_…`). **Canonical name.** |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | public | Legacy alias for the same key (accepted by the init) |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | Optional; defaults to `https://us.i.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | public | Sentry DSN override (public by design; hardcoded fallback exists) |
| `SENTRY_AUTH_TOKEN` | secret | Sentry source-map uploads at build |
| `SENTRY_ORG` / `SENTRY_PROJECT` | secret | Sentry org/project for uploads |

## Mail (Resend)

| Variable | Public | Used for |
|---|---|---|
| `RESEND_API_KEY` | secret | Transactional mail — welcome (verification), apology (report cleared), ban notices, Lions Den door messages |
| `REGISTERED_DOMAIN` | secret | The sending domain (`smartscott.online`) |

## Owner / misc

| Variable | Public | Used for |
|---|---|---|
| `ADMIN_KEY` | secret | Legacy fallback for the `/owner` booth (owner-account check is primary) |

## Where the values live

- **`env.new`** — THE master vault (gitignored). Every script and live test reads it directly
  (`config({ path: 'env.new' })`). Edit here, never anywhere else.
- **`.env.local`** — exists only because Next.js auto-loads it for `pnpm dev`/`pnpm build`
  locally. It is a generated copy — `node scripts/sync-env.mjs` refreshes it from `env.new`.
  **Never hand-edit `.env.local`**; if it looks stale, re-run sync-env.
- **`.env.local.example`** — the tracked scaffold (blank values, comments); update it when
  adding a variable.
- **Vercel** — production. `NEXT_PUBLIC_*` vars are inlined at build; changing them requires a
  redeploy. Secrets are runtime env on the serverless functions. Keep it in sync with `env.new`.
- **CI** — only public keys (`NEXT_PUBLIC_SITE_URL`, Supabase URL + anon + publishable). No
  secrets ever enter `.github/workflows/ci.yml`.

> History: the original `.env.local` carried pre-wipe keys (old project refs, old PostHog
> project) after the founder deleted every integration and started fresh with `env.new`. That
> hybrid is exactly the drift this discipline kills — scripts read `env.new`, period.
