# Club Cheeky

> A dating app built like a nightclub. Everyone gets in free with a verified
> ID — **everyone's a VIP with an ID here.**

Live at **[smartscott.online](https://smartscott.online)** — every push to
`main` auto-deploys to Vercel.

## What it is

Club Cheeky is a nightclub, not a menu. Members walk a real building:

| Room | Route | What happens there |
|---|---|---|
| 🚪 The street / landing | `/` | The marquee. Enter the club. |
| 🪪 The door (verification) | `/verify` | Stripe Identity ID + selfie → Silver card, VIP badge, 20 tokens. The velvet rope is up until you check in. |
| 🏠 The lobby | `/club` | The entrance room — VIP area, Gift Shop, Chats, Spark List, Elevators, Coat Check, Brutus at the door. |
| 🛗 The floors | `/floors` · `/floor/[slug]` | Silver → Gold → Platinum → Diamond. Each floor is its own room with its own art, its own event, and its own member of the crew. Locked floors show the rope, not a price. |
| 📅 The Event Center | `/events` · `/events/[kind]` | The hourly playlist — Dance Floor (:00), Themed Night (:15), Speed Dating (:30), Rooftop (:45). Join any room any time; your spot is held for the next set. Rooms are lit up to your floor. |
| 🎭 The crew | `/crew` · `/chat/[slug]` | Six AI characters who run the club. Meet them on their floors and chat. |
| 🎁 The Gift Shop | `/gifts` | Buy gifts with tokens and send them to members. |
| 🧥 Coat Check | `/coat-check` | Gems, badges, your daily streak, and crew bonds. |
| 🎟️ Swag Shop | `/swag` | Redeem giveaway codes (SWAG-XXXXXXXX) — always in the nav. |
| ⚡ The Spark List | `/browse` | Who's out tonight, filtered by mutual dating preference. |
| 💬 Cheeky Chats | `/messages` | Conversations, waves, Date Night with matches. |
| 👤 Account | `/account` | Your card (grant-aware), avatar name, one-liner, photos, billing. |
| 🔑 Owner's back door | `/owner` | The founder's booth — swag codes, grants, flags (owner account only). |

### The three pillars

- **The Ladder** — Guest (street) → Silver (verified, free) → Gold ($9.99) →
  Platinum ($19.99) → Diamond ($29.99) → Gems (collectibles).
- **The Event Engine** — live scheduled events; the hourly Dance Floor is
  the reference implementation.
- **The Token Economy** — earn (verify, referrals, giveaways) or buy
  (100/$4.99, 1000/$9.99); events cost tokens per floor. Server-side ledger
  only — never trust the client.

### The crew

They're workers, not actors. Each lives on their own floor; their chats are
gated by the floor you can reach (a reward for membership, not a paywall).
The crew can always greet any member (milestone messages fire regardless of
tier). Chaz, the manager, rides the floating concierge on every page.

| Member | Job | Floor |
|---|---|---|
| Brutus | Bouncer | The lobby |
| The DJ (D34D_B34T) | Spins the floor | Silver |
| Roxy | Mixologist | Gold |
| Trixie | Waitress | Platinum |
| Valentina | Hostess | Diamond |
| Chaz Sterling | Club manager | Everywhere |

### Mission guardrails

The free tier stays genuinely free and fun (30 messages/day, 5 new
conversations/day — generous on purpose). No dark patterns, no fake likes,
no artificial scarcity. Anti-gouging is the brand ($9.99–$29.99 ceiling).
Silent loss, public win. Safety is a feature: verification-as-entry,
report/block from any chat, honeypots for bots.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind** — server
  components by default; `'use client'` only where interactivity requires.
- **Supabase** — auth, Postgres with **Row Level Security on every table**,
  migrations, generated types.
- **Stripe** — subscriptions, checkout, and Identity (verification).
- **DeepSeek** (`/api/agent`) — the crew's brains; persona prompts live in
  the `characters` table.
- **PostHog** — product analytics (`instrumentation-client.ts`).
- **Sentry** — error tracking (wizard setup).
- **Vercel** — the only build gate: every push to `main` builds, deploys,
  and fails loud.

## Develop locally

```bash
pnpm install
cp .env.local.example .env.local   # fill in your keys (see below)
pnpm supabase:start                # local Postgres + auth (Docker)
pnpm supabase:reset                # apply migrations + seed
pnpm dev                           # http://localhost:3000
```

For local Stripe webhooks (needed for product/subscription sync):

```bash
pnpm stripe:login
pnpm stripe:listen                 # forward webhooks to localhost:3000/api/webhooks
pnpm stripe:fixtures               # bootstrap products/prices from fixtures/
```

The crew's chat needs `DEEPSEEK_API_KEY`. Verification needs real Stripe
keys. PostHog/Sentry are optional locally.

## Environment variables

The full set (see `.env.local.example` for the core local-dev values):

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (anon key only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only writes (never in client code) |
| `SUPABASE_ANON_KEY` · `SUPABASE_JWT_SECRET` | Local dev / server auth helpers |
| `POSTGRES_URL` (+ `_NON_POOLING`, `_PRISMA_URL`, `_DATABASE`, `_PASSWORD`, `_HOST`) | Hosted Postgres |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` | Stripe |
| `DEEPSEEK_API_KEY` | `/api/agent` — the crew's chat engine |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` · `NEXT_PUBLIC_POSTHOG_HOST` | PostHog analytics |
| `SENTRY_AUTH_TOKEN` · `SENTRY_API_KEY` | Sentry source-map uploads |
| `VERCEL_OIDC_TOKEN` | Created by `vercel link` for CI builds |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm lint` | Dev server (turbo) / production build / lint |
| `pnpm prettier-fix` | Format everything (Prettier is enforced) |
| `pnpm stripe:listen` / `pnpm stripe:fixtures` | Local webhooks / bootstrap products |
| `pnpm supabase:start` / `stop` / `reset` | Local Postgres + auth lifecycle |
| `pnpm supabase:generate-types` | Regenerate `types_db.ts` after schema changes — commit the diff |
| `pnpm supabase:generate-migration` | Diff local schema into `supabase/migrations/` |
| `pnpm supabase:push` / `pull` | Schema sync against the linked project |
| `node scripts/migrate-hosted.mjs <name>` | Apply one migration to the **hosted** database |
| `node scripts/backfill-*.mjs` / `check-*.mjs` / `test-*.mjs` | Ops utilities (see `scripts/`) |

## Database & migrations

- Schema changes go through `supabase/migrations/` (41 and counting).
- Apply migrations **both** hosted (`node scripts/migrate-hosted.mjs <name>`)
  **and** local (`pnpm supabase:reset`), then regenerate types and commit the
  diff.
- **RLS is mandatory** on every table. Service role for server writes; the
  client only ever uses the anon key.
- Money is stored as integers (cents); token amounts are server-side ledger
  deltas only.

## Deployment

- `main` auto-deploys to Vercel (`smartscott.online`). No CI ceremony — the
  safety valve is git history + milestone tags.
- Data changes (grants, swag codes, tokens, event slots) are **hot** — no
  deploy. Only code changes need pushes.
- Never push a broken build: `pnpm lint` + `pnpm build` pass first.

## Repo map

```
app/            Next.js routes (landing, signin, account, club, floors, events,
                chat, crew, gifts, coat-check, swag, browse, messages, verify,
                owner, api/)
components/     ui primitives (ui/) + feature components (Agent, Club, Events,
                Gifts, Messages, Audio, Swag, Navbar, Footer)
utils/          supabase clients + queries, stripe, auth helpers, floors map,
                characters map, events config, swag, helpers
supabase/       local config + migrations (41)
scripts/        dev utilities (migrate-hosted, backfill-*, check-*, test-*)
styles/         global css (main.css) + floor palettes (styles/palettes/*.scss)
docs/           PRD-foundation.md + PRDs + Governance/ + floor-map.md
fixtures/       Stripe fixture JSON for bootstrapping products/prices
persona_assets/ founder's source art, style guides, personas, audio (originals)
public/         served assets: brand/ (floor art, entrance), personas/ (crew
                images), audio/ (DJ tracks), video/ (track art)
schema.sql      reference schema (mirrors migrations)
types_db.ts     generated Supabase types — commit after regenerating
```

## Working here

- **PRD first.** Product decisions land in `docs/` before code — and when a
  decision changes, the doc and the code change together.
- **Governance is code.** The policies in `docs/Governance/` (terms, privacy,
  safety, retention, refunds) are binding — schema and flows satisfy them.
- **Surgical changes.** In existing code, do exactly what the task asks. No
  opportunistic refactors.
- **Ask when it's ambiguous.** When a product decision is unclear, ask rather
  than inventing an answer that contradicts the PRD.

Read [`AGENTS.md`](AGENTS.md) — the working guidelines — and
[`docs/PRD-foundation.md`](docs/PRD-foundation.md) — the product spec.
[`docs/floor-map.md`](docs/floor-map.md) is the source of truth for what
belongs on every floor.

## Validation checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] Affected user flow manually verified (signup, verification, checkout, event)
- [ ] No template-branding leftovers (grep for "ACME", "Subscription Starter", "vercel.com")
- [ ] PRD/doc updated if behavior changed
