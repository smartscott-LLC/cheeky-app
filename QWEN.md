# Club Cheeky — QWEN.md

> Project context for AI agents working on Club Cheeky.

## Project Overview

**Club Cheeky** is a dating app built like a nightclub — live at [smartscott.online](https://smartscott.online). Every push to `main` auto-deploys to Vercel production. Policy and governance are baked in from the start — not squeezed in later.

The product has three pillars:
1. **The Ladder** — Guest (street) → Silver (verified, free) → Gold ($9.99) → Platinum ($19.99) → Diamond ($29.99) → Gems (collectibles, later phase).
2. **The Event Engine** — live scheduled events (hourly Dance Floor is the reference).
3. **The Token Economy** — earn (verify, referrals, giveaways) or buy (100/$4.99, 1000/$9.99); events cost tokens per floor. Server-side ledger only.

It's a dating app with gamification — floors, events, collectibles, crew characters, and an MMORPG-style lounge chat.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15** (App Router) + **TypeScript** |
| Styling | **Tailwind CSS 3** + custom fonts (Fascinate, Damion, Rancho) |
| Auth & Database | **Supabase** (Auth + Postgres + RLS on every table) |
| Payments & Verification | **Stripe** (subscriptions, checkout, Identity) |
| User Storage | **MongoDB** (photos, collectibles, user-owned content) |
| Lounge Chat | **Stream Chat** (full moderation: blocks, mutes, rate limits, violations, whispers, tier-gated channels) |
| AI Chat | **Agnes-02.5-flash** from [AgnesAI](https://apihub.agnes-ai.com/v1) via `/api/agent` (crew character brains) |
| Error Tracking | **Sentry** |
| Deployment | **Vercel** (auto-deploy from `main`) |
| Lounge Chat (microfrontend) | **In-gameChatUI** (`cheeky-lounge-app` — separate Vite + React 19 + Tailwind v4 app at `/home/server/In-gameChatUI/`) |

### Key Dependencies

- `@supabase/ssr` + `@supabase/supabase-js` — Supabase client/server
- `stripe` — server-side Stripe SDK
- `@stripe/react-stripe-js` + `@stripe/stripe-js` — client-side Stripe
- `stream-chat` + `stream-chat-react` — Stream Chat transport
- `ai` + AgnesAI-compatible SDK — AI SDK for crew chat (Agnes-02.5-flash)
- `lucide-react` — icons
- `tailwind-merge` + `class-variance-authority` + `clsx` — utility styling
- `resend` — transactional emails

### Why the lounge chat is a separate microfrontend

Three deliberate reasons:
1. **Moderation isolation** — lounge chat moderation (tier gating, horn cooldowns, public room decorum) is a different policy surface from dating chat moderation (consent gates, rate limits, report/block). Separate deploys mean a lounge bug can't take down dating chat moderation.
2. **Deployment blast radius** — the event engine cron, token ledger, and Stripe webhooks are the critical path. A bad lounge deploy doesn't break matching, messaging, or events.
3. **Dual security gates** — the lounge routes through its own Stream token endpoint, the dating chat through its own. Different auth paths, different RLS policies, different rate limits. One breach doesn't ladder into the other.

The lounge is imported as a pnpm workspace dep during development (live-reload both apps), but built and served independently in production via Vercel microfrontends.

## Routes

| Route | Page |
|-------|------|
| `/` | Landing / "the street" |
| `/signin` | Sign in |
| `/verify` | Stripe Identity verification → Silver card |
| `/club` | The lobby (main entrance) |
| `/floors`, `/floor/[slug]` | Floor listing + per-floor rooms |
| `/events`, `/events/[kind]` | Event center + per-event rooms (dance-floor, speed, blind-date, rooftop) |
| `/browse` | Spark List — Swipes, L³, Matchmaker games |
| `/messages`, `/messages/[id]` | Conversations, waves, Date Night |
| `/crew`, `/chat/[slug]` | AI crew members + character chats |
| `/gifts` | Gift shop (buy/send with tokens) |
| `/coat-check` | Gems, badges, streak, crew bonds |
| `/swag` | Redeem giveaway codes |
| `/account` | Profile, avatar, photos, billing |
| `/owner` | Founder's backdoor — swag codes, grants, flags |
| `/pricing` | Pricing page |
| `/terms`, `/privacy`, `/aup`, `/refunds`, `/contact`, `/best-practices`, `/sitemap`, `/law-enforcement` | Legal / policy pages |
| `/store` | Token store |

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/agent` | AgnesAI crew chat engine (Agnes-02.5-flash) |
| `/api/announcement` | Announcement ticker |
| `/api/chat/stream-token` | Issue Stream Chat auth tokens |
| `/api/chat/stream-webhook` | Stream Chat webhook receiver (HMAC-signed) |
| `/api/taskbar` | Tiki Taskbar state |
| `/api/webhooks` | Stripe webhooks (products, subscriptions, Identity) |

## Key Directory Structure

```
app/              Next.js App Router pages + API routes
components/       React components (ui/ for primitives, feature directories)
utils/            Business logic (supabase/, stripe/, stream/, auth, events, floors, tokens, etc.)
styles/           CSS (main.css, palette-colors.js, lounge-animations.css, fonts/)
supabase/         Migrations (87+), seed data
docs/             PRDs, game engine docs, governance policies, floor map, component library
tests/            node:test suite (safe + live)
scripts/          Dev utilities (migrate-hosted, sync-env, seed-test-members, purge-mmtest, etc.)
fixtures/         Stripe fixture JSON for bootstrapping products/prices
public/
  cheeky_icons_and_things/   112 custom icons (WebP, optimized) — use these as much as possible
  brand/                     Brand assets
  personas/                  Persona images
  audio/                     Audio assets
  icons/                     App icons
types_db.ts       Generated Supabase types (regenerate after schema changes)
```

## Building & Running

```bash
pnpm install              # Install dependencies
pnpm dev                  # Dev server (turbo) — http://localhost:3000
pnpm build                # Production build
pnpm start                # Start production server
pnpm lint                 # Lint (Next.js lint)
pnpm prettier-fix         # Format all files with Prettier
pnpm test                 # Node test suite (safe tests only)
```

### Stripe local workflow (optional)

```bash
pnpm stripe:login         # Login to Stripe CLI
pnpm stripe:listen        # Forward webhooks to localhost:3000/api/webhooks
pnpm stripe:fixtures      # Bootstrap products/prices from fixtures/
```

### Database workflow (hosted-first — no local DB)

```bash
node scripts/migrate-hosted.mjs <migration-name>   # Apply a migration to hosted
pnpm supabase:generate-types                        # Regenerate types_db.ts
pnpm supabase:push / pull / reset                   # Schema sync (hosted)
```

## Microfrontend Routing (Vercel)

The app uses Vercel microfrontends to serve the lounge chat (In-gameChatUI) as a separate application with its own deployment cadence.

### Current `microfrontends.json`

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "cheeky-app": {
      "development": {
        "fallback": "www.smartscott.online"
      }
    },
    "in-gamechatui": {
      "routing": [
        {
          "paths": ["/lounge/:path*"]
        }
      ]
    }
  }
}
```

### How Vercel microfrontend routing works

1. Vercel reads `microfrontends.json` from the live deployment of the **default application** (cheeky-app).
2. Requests to paths matching `/lounge/:path*` are routed to the `in-gamechatui` project's production deployment — no additional network hop, it happens within the same request.
3. All other paths are handled by `cheeky-app` (the default).
4. The `lounge.smartscott.online` subdomain routes through the same microfrontend group — Vercel resolves it to the same routing table.

### Domain setup

| Domain | Purpose | Routing |
|--------|---------|---------|
| `smartscott.online` | Main app front door (landing, signin, club, events, etc.) | Default — handled by `cheeky-app` |
| `lounge.smartscott.online` | Lounge chat subdomain | Routes through the same microfrontend group |

**To set up `lounge.smartscott.online`:**
1. Add `lounge.smartscott.online` as a custom domain in the Vercel project settings for the microfrontend group (under the `cheeky-app` project's Domains settings).
2. Vercel will handle DNS — add the CNAME record it provides to your DNS provider.
3. The subdomain routes through the same `microfrontends.json` routing table — paths under `/lounge/` go to `in-gamechatui`, everything else falls back to `cheeky-app`.

### Lounge app build configuration

The lounge app (In-gameChatUI) uses Vite with a dynamic `base` path:

```ts
// vite.config.ts
base: process.env.APP_PUBLIC_URL ? `${process.env.APP_PUBLIC_URL}/` : '/',
```

For production deployment on Vercel as a microfrontend child, the lounge app must be built with:

```
APP_PUBLIC_URL=/lounge
```

This ensures:
- JS/CSS assets are served from `/lounge/assets/...`
- The app's root path becomes `/lounge/`
- No collisions with the main app's static assets

### Asset prefix

Each microfrontend gets an auto-generated asset prefix (`vc-ap-<hash>`) to prevent JS/CSS collisions. The `public/` directory assets in the child app need to be placed under a subdirectory matching the asset prefix. When the lounge app is served through the main app's `index.html`, the asset prefix ensures static assets from both apps don't collide.

### Important: deploy order matters

When changing `microfrontends.json` routing:
1. Deploy the **child app** (`in-gamechatui`) first — make sure it can handle `/lounge/` paths.
2. Then deploy the **default app** (`cheeky-app`) with the updated `microfrontends.json` — this activates the routing.
3. If you need to revert, use Vercel Instant Rollback on the default app to restore the old routing rules.

## Style System (Non-Negotiable)

The entire app follows one consistent pattern — no grey, no alternate colors:

| Role | Font | Color | Hex | Usage |
|------|------|-------|-----|-------|
| Hero / Headers / Section Labels | **Fascinate** | Gold | `#FFD800` | Large headers, section titles, major labels |
| Small Headers / Element Labels | **Damion** | Cyan | `#66FFFF` | Small headers, labels on single elements |
| Body Text | **Rancho** | pink | `#FFB5FF` | All body copy, descriptions, paragraphs |

- `font-synthesis: none` is set on headings so weight utilities never fake-bold these single-weight display fonts.
- Floor color schemes live in `styles/palette-colors.js` (source of truth), mirrored as Tailwind tokens in `tailwind.config.js`. Never hardcode hex in components.
- The three fonts are loaded as local fonts via `next/font/local` in the root layout.

## Development Conventions

### Coding standards

- **Server components by default** — `'use client'` only where interactivity requires it.
- **UI primitives** live in `components/ui/` and are presentational only — business logic goes in `utils/`.
- **CSS modules** for component-specific styles (`Component.module.css` pattern).
- **Path alias**: `@/` maps to project root (e.g., `@/utils/supabase/client`).

### Database architecture

- **Supabase + Stripe** are threaded together for membership, validation, auth, and token services.
- **MongoDB** handles user-owned storage: photos, collectibles, and similar content.
- **Stream Chat** handles everything for the lounge chat: blocks, mutes, rate limits, violations, whispers, tier-gated channels, and moderation.
- **RLS is mandatory** on every Supabase table. Never disable "just for now."
- **Service role key** is server-only. Client code uses the anon key.
- **Schema changes** go through `supabase/migrations/`. Apply to hosted, regenerate types, commit the diff.
- **Money** stored as integers (cents); **tokens** as server-side ledger deltas only.
- **Primary keys** are always UUIDs. Stable slugs/labels only as secondary identity for URLs/config.
- **No local databases** — everything is cloud-hosted.

### Two game engines

- **Events Engine** — clock-driven scheduled rooms (Dance Floor, Themed Night, Speed Dating, Rooftop). Owns `events`, `event_entries`, `event_picks`, token holds → spend/refund, the minute cron (`finalize_events`).
- **Spark Game Spine** — instant solo games (Swipes, L³, Matchmaker). Shared machinery: `matches`, rewards, messaging stack, rate limits. Server-authoritative RPCs.

### Testing

- **Safe** (`pnpm test`, runs in CI): pure logic tests.
- **Live** (`RUN_LIVE_TESTS=1`): webhook handlers, token engine, AgnesAI, events, L³, matchmaker. Hits production with throwaway members that auto-cleanup.
- Token engine burst: `RUN_LIVE_TESTS=1 STRESS_N=1000 node --test tests/token-engine.live.test.mjs`
- See `tests/README.md` for full matrix.

### Validation checklist (before any push)

- [ ] `pnpm lint` passes (zero warnings or errors)
- [ ] `pnpm test` passes (safe suite; run live suites if the change touches events/tokens/webhooks)
- [ ] `pnpm build` passes
- [ ] Migrations ran if schema changed (`node scripts/migrate-hosted.mjs <name>`)
- [ ] Affected user flow manually verified (signup, verification, checkout, event)
- [ ] No template-branding leftovers (grep for "ACME", "Subscription Starter", "vercel.com")
- [ ] PRD/doc updated + `CHANGELOG.md` entry if behavior changed

### Environment & secrets

- **`env.new`** is the master vault (gitignored). Every script reads it directly.
- **`.env.local`** is a generated copy for `pnpm dev` — refresh via `node scripts/sync-env.mjs`. Never hand-edit it.
- Both apps (cheeky-app + In-gameChatUI) have their own `.env.local` files with their own secrets.
- Only `NEXT_PUBLIC_*` keys may appear in tracked files or CI.
- **Never read or surface secret values** from `.env*` files in tool output or chat. Read file structure only (keys, not values).
- **No keys are pushed to git** — all vars and secrets are set directly in Vercel and the databases. Changes happen on the fly as needed.

### Important policies

- **PRD first** — product decisions land in `docs/` before code.
- **Surgical changes** — do exactly what the task asks. No opportunistic refactors.
- **No placeholders** — never suggest placeholder images/text/dummy content. Use real assets (the 112 custom icons in `public/cheeky_icons_and_things/` are already optimized WebP) or leave the space for the founder to fill.
- **No dark patterns** — no fake likes, artificial scarcity, surprise charges, hidden cancel buttons.
- **Free tier stays genuinely free** — 30 messages/day, 5 new conversations/day.
- **Anti-gouging** — $9.99–$29.99/month ceiling by design.
- **Silent loss, public win** — rejection is private, wins are celebrated.
- **Safety is a feature** — verification-as-entry, report/block from any chat.
- **Commit to main directly** during build-out; tag milestones. Every push auto-deploys — never push a broken build.
- **Policy & governance are the foundation** — baked in from the start, not retrofitted. The app passes all local, state, and federal ordinances and is Stripe-approved.

### Domain vocabulary

| Term | Meaning |
|------|---------|
| Guest | Unverified user on the street/tutorial zone. No events, no tokens. |
| Silver card | Free verified tier. ID + selfie → badge, 20 tokens, event access. |
| Gold / Platinum / Diamond | Paid floors with events, visibility, and messaging-down rights. |
| Gems | Limited collectible cards (Ruby, Emerald, Sapphire, Topaz) — later phase. |
| Tokens | In-app currency. Server-side ledger only; never trust the client. |
| Dance Floor | Hourly event: 3 tokens, grid, 2-min pick, instant mutual match, one song. |
| Guest pass | Member brings a Guest up for 24h. |
| Floor | A subscription tier = a level of the club. |
| Lounge | The MMORPG-style community chat (separate microfrontend, moderated by Stream). |
