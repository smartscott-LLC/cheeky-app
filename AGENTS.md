# AGENTS.md — Cheeky Project Guidelines

Guidelines for everyone working in this repo — humans and agents — so we stay aligned as we scale. The product spec is `docs/PRD-foundation.md`; that is the source of truth for *what* we build. This file is *how* we build it.

## What Cheeky is

A dating app built like a nightclub. Three pillars:

1. **The Ladder** — Guest (street) → Silver (verified, free) → Gold ($9.99) → Platinum ($19.99) → Diamond ($29.99) → Gems (collectibles).
2. **The Event Engine** — live scheduled events; the hourly Dance Floor is the reference implementation.
3. **The Token Economy** — earn (verify, referrals, giveaways) or buy (100/$4.99, 1000/$9.99); events cost tokens per floor.

## Domain vocabulary (use these terms exactly)

| Term | Meaning |
|---|---|
| Guest | Unverified user on the street/tutorial zone. No events, no tokens. |
| Silver card | Free verified tier. ID + selfie → badge, 20 tokens, event access. |
| Gold / Platinum / Diamond | Paid floors with events, visibility, and messaging-down rights. |
| Gems | Limited collectible cards (Ruby, Emerald, Sapphire, Topaz) — later phase. |
| Tokens | In-app currency. Server-side ledger only; never trust the client. |
| Dance Floor | Hourly event: 3 tokens, grid, 2-min pick, instant mutual match, one song. |
| Guest pass | Member brings a Guest up for 24h. |
| Floor | A subscription tier = a level of the club. |

## Mission guardrails (non-negotiable)

- **The free tier must stay genuinely free and fun.** Never gate core match + matched chat behind payment. The 5 unmatched-messages/day limit is the free-tier cap — do not shrink it to drive upgrades.
- **No dark patterns.** No fake likes, no artificial scarcity messaging, no surprise charges, no hiding the cancel button.
- **Anti-gouging is the brand.** $9.99–$29.99/month is the ceiling by design. Any pricing change goes through the PRD first.
- **Silent loss, public win.** Rejection is always private (refunds, no match announcements). Wins are announced and celebrated.
- **Safety is a feature, not a cost center.** Verification-as-entry, report/block from any chat, no follow-ups after a decline.

## How we work

- **PRD first.** Product decisions land in `docs/PRD-foundation.md` (or a feature PRD) before code. If a decision changes, update the doc and the code together.
- **Governance is code.** The policies in `docs/Governance/` (terms, privacy, safety, retention, refunds) are binding on the build — schema and flows are designed to satisfy them, and policy changes update code + docs together.
- **Surgical changes.** In existing code, do exactly what the task asks — no opportunistic refactors, no renamed files/variables unless the task calls for it.
- **Ask when it's ambiguous.** When a product decision is unclear, ask rather than inventing an answer that contradicts the PRD.
- **Build on main during construction.** We're in build-out: `main` is always current and every push auto-deploys to Vercel (`smartscott.online`). The safety valve is git history + milestone tags, not a stale main — when a floor/area is fluid and testable, tag it (e.g. `v0.1-floor-1-locked`) as a save spot, then cut per-area branches (`feat/floor-1`) for the next area and merge back when fluid. No PR ceremony until there are real users on the app.
- **Commit messages describe *what and why*.** Never push a broken build — `pnpm lint` + `pnpm build` pass before pushing, because a bad push goes live on production.
- **Validate before saying done.** `pnpm lint`, `pnpm build`, and a manual pass of the affected flow (auth / checkout / event).

## Engineering conventions

- **Stack:** Next.js 15 (App Router), Supabase (auth + Postgres + RLS), Stripe (billing + Identity + checkout), Tailwind, TypeScript.
- **Components:** server components by default; `'use client'` only where interactivity requires it. UI primitives live in `components/ui/`. Keep `components/ui/` presentational — business logic goes in `utils/`.
- **Styling:** Tailwind utility classes; CSS modules for component-specific styles (`components/ui/Navbar/Navbar.module.css` pattern). Floor color schemes live in `styles/palettes/*.scss` (source of truth) and are mirrored as Tailwind tokens (`club`, `gold`, `platinum`, `diamond`) in `tailwind.config.js` — never hardcode hex in components.
- **Supabase:**
  - Row Level Security is mandatory on every table. Never disable RLS "just for now."
  - Service role key is server-only. Client code uses the anon key.
  - Schema changes go through `supabase/migrations/`; regenerate types with `pnpm supabase:generate-types` (writes `types_db.ts`) and commit the diff.
- **Stripe:**
  - Stripe is the source of truth for products/prices; the webhook syncs them into `products`/`prices` tables.
  - Checkout runs server-side (`utils/stripe/server.ts`); subscriptions gate floors via `subscriptions` + entitlements.
  - Stripe Identity is the candidate for verification (keeps the stack unified) — confirm before Phase 1.
- **Tokens (when built):** integer microcurrency, atomic server-side ledger, RLS-protected; refunds for no-match events; never computed from client state.
- **Money display:** format with `Intl.NumberFormat` (already the pattern in `Pricing.tsx`); store amounts as integers (cents).

## Repo map

```
app/            Next.js routes: / (landing), /signin, /account, /api
components/     ui primitives + feature components (icons/, ui/)
utils/          supabase clients + queries, stripe client/server, auth helpers
supabase/       local config + migrations
styles/         global css (main.css) + floor palettes (styles/palettes/*.scss)
docs/           PRD-foundation.md + Governance/ policies + future feature PRDs
fixtures/       Stripe fixture JSON for bootstrapping products/prices
schema.sql      reference schema (mirrors migrations)
types_db.ts     generated Supabase types — commit after regenerating
```

## Validation checklist (before any PR)

- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] Affected user flow manually verified (signup, verification, checkout, event)
- [ ] No template-branding leftovers (grep for "ACME", "Subscription Starter", "vercel.com" in app code)
- [ ] PRD/doc updated if behavior changed
