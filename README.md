# Club Cheeky

A dating app built like a nightclub. Everyone gets in free with a verified ID — **everyone's a VIP with an ID here.**

- **The Ladder** — Guest (street) → Silver (verified, free) → Gold ($9.99) → Platinum ($19.99) → Diamond ($29.99) → Gems (collectibles)
- **The Event Engine** — live scheduled events; the hourly Dance Floor is the reference implementation
- **The Token Economy** — earn (verify, referrals, giveaways) or buy (100/$4.99, 1000/$9.99); events cost tokens per floor

> Product spec: [`docs/PRD-foundation.md`](docs/PRD-foundation.md) — the source of truth for what we build.
> Working guidelines: [`AGENTS.md`](AGENTS.md) — how we build it.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Supabase** — auth, Postgres with Row Level Security, realtime
- **Stripe** — subscriptions, checkout, and Identity (verification candidate)

## Develop locally

```bash
pnpm install
cp .env.local.example .env.local   # fill in your keys
pnpm supabase:start                # local Postgres + auth (Docker)
pnpm dev                           # http://localhost:3000
```

For local Stripe webhooks (needed for product/subscription sync):

```bash
pnpm stripe:login
pnpm stripe:listen                 # forward webhooks to localhost:3000/api/webhooks
```

Useful scripts (full list in `package.json`):

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server (turbo) |
| `pnpm build` / `pnpm lint` | Production build / lint |
| `pnpm prettier-fix` | Format everything |
| `pnpm stripe:fixtures` | Bootstrap test products/prices from `fixtures/stripe-fixtures.json` |
| `pnpm supabase:generate-types` | Regenerate `types_db.ts` after schema changes (commit the diff) |
| `pnpm supabase:generate-migration` | Diff local schema into `supabase/migrations/` |
| `pnpm supabase:push` / `supabase:pull` | Push/pull schema against the linked project |

## Stripe products (source of truth: Stripe dashboard)

| Product | Price | Notes |
|---|---|---|
| Standard Membership (Silver) | $0/mo | Free verified tier — ID + selfie → card, badge, 20 tokens |
| Gold Membership | $9.99/mo | Themed nights, more events |
| Platinum Membership | $19.99/mo | Speed Dating, upper floors |
| Diamond Club | $29.99/mo | Penthouse, rooftop, whole building |
| Cheeky Token Bag | $4.99 | 100 tokens |
| Cheeky Token Bundle | $9.99 | 1000 tokens (bulk rate for higher floors) |

Products/prices sync into `products`/`prices` tables via the Stripe webhook. See `fixtures/` for the bootstrap JSON.

## Repo map

```
app/            routes: / (landing), /signin, /account, /api
components/     ui primitives (components/ui) + icons
utils/          supabase clients/queries, stripe client/server, auth helpers
supabase/       local config + migrations
docs/           PRD-foundation.md + future feature PRDs
fixtures/       Stripe bootstrap JSON
schema.sql      reference schema (mirrors migrations)
types_db.ts     generated Supabase types
```

## Status

Phase 0 (foundation + rebrand) in progress. Roadmap lives in [`docs/PRD-foundation.md`](docs/PRD-foundation.md#11-roadmap).
