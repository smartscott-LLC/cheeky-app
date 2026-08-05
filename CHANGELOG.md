# Changelog

All notable changes to Club Cheeky. Follows [Keep a Changelog](https://keepachangelog.com/); the
project is in build-out, so this is milestone-shaped rather than semantic-version-shaped.
Milestone tags (`v0.1-floor-1-locked`, `v0.1-dance-floor`, `v1.0-den-locked`, …) are the save
points — every push to `main` is production.

## [Unreleased]

### Changed

- **One env, period**: every script and live test now reads `env.new` (the master vault)
  instead of `.env.local` — the stale hybrid from the pre-wipe era was the source of the
  PostHog-key and pooler-ref mixups. `.env.local` is now a generated copy refreshed by
  `node scripts/sync-env.mjs`; never hand-edit it.
- **Repo organized**: historical audits + setup reports moved to `docs/archives/`;
  `first-floor-flow.mmd` lives in `docs/`; stale `schema.sql`, Stripe CSV exports, and build
  junk removed; governance PDFs committed under `docs/Governance/`. Repo maps updated.
- **Formatting pass**: Prettier run across the whole repo (`.mmd` ignored — no parser), lint +
  test + build re-verified green after.
- **SEO**: `/sitemap` (the HTML map of the club, footer-linked), `/sitemap.xml` for Search
  Console, and `/robots.txt` (members-only rooms + the Den disallowed).
- **Perf (LCP)**: the served floor/entrance art converted PNG → WebP — **20MB → 1.75MB
  (91% smaller)** with `sharp`; imports switched; unused diagram/demo/deploy assets and
  stray `cast.png` grids removed.
- **Perf (round two)**: every persona converted too — **24.5MB → 1.5MB (94%)**, DB character
  paths migrated to `.webp` (applied to hosted), static crew refs switched. The raster-in-SVG
  twins purged; only the real vector logos (github/stripe/nextjs/supabase/vercel) remain.
- **Repo light**: `persona_assets/` (58MB of source masters) removed — nothing references it at
  runtime; originals live outside the repo (founder's backups). The UI style guide moved to
  `docs/UI-STYLE-GUIDE.txt` as the working design spec. The unused `public/video/` MP4s also
  removed. Served `public/` is now ~6.8MB total (was ~73MB with all the originals).
- **Contrast pass**: every `text-zinc-*` (333 usages) → the new `green` token (`#00FF40`, electric
  club neon) — gray-on-black text was the accessibility weak spot (some shades ~3.5:1); green on
  black is 15.4:1. Light-surface exceptions keep dark text (white buttons, light toasts); hover
  accents stay gold.
- **Landing rhythm**: the all-green body below the hero now alternates green / pink (`text-club`)
  per section — How-it-works pink, Dance Floor green, Floors pink, Pricing green with the
  messaging card + token note pink. Headers stay as they were.
- **Accent swap**: the text accent moved green → **cyan** (the founder's call — one hue, no
  straying; cyan on black is ~21:1, the strongest contrast in the kit). The full 50–950 scales
  for gold / cyan / bubblegum-fizz / blue-violet are wired in (`styles/palette-colors.js`,
  mirrored from `styles/tailwind_color_scales.md`).

## [v1.1-docs-locked] — 2026-08-05

### Added

- **One-stop door**: `/verify` is the single entry — all four consents + account fields with
  Brutus in one form, then Stripe Identity, then straight to the lobby on email confirm.
- **PWA/Android wrapper**: manifest, service worker, icons, `assetlinks.json`
  (`docs/ANDROID-WRAPPER.md` — the Play Store playbook; web app is the app, no native rebuild).
- **Test suite** (`node:test`, zero new dependencies):
  - `pnpm test` — safe unit tests (token-amount rule), runs in CI.
  - `tests/webhook.live.test.mjs` — signature rejection, idempotency on replay, concurrent burst.
  - `tests/token-engine.live.test.mjs` — exact swag credits, no double-redeem, **N-way
    concurrent event joins through the production pooler** (`STRESS_N` knob; measured 1000 joins
    in ~13s, all consistent), no over-commit.
  - `tests/ai-probe.live.test.mjs` — DeepSeek burst probe (8 concurrent: 8/8 ok, ~1s, no 429s).
  - Run live suites with `RUN_LIVE_TESTS=1`; throwaway members, full cleanup.
- **Rate/abuse limits (audit #9)**: `rate_limits` table + `bump_rate_limit` RPC; `/api/agent`
  capped 60/hr per member + 200/hr per IP; `reportUser` capped 5/hr per member (surfaces the
  limiter message instead of falsely confirming). Fails open on infra hiccups.
- **Documentation hardening**: CHANGELOG, CONTRIBUTING, component library, environment
  reference, AGENTS.md/README refresh.

### Fixed

- **Bot-guard trigger was silently killing likes and event joins** (caught by the new test
  suite): `handle_bot_guard` read `new.sender_id` unconditionally, but `likes` (`liker_id`) and
  `event_entries` (`user_id`) have no such column — every like and every event join errored.
  The guard now reads the user-id column by name via `tg_argv` + jsonb.
- **`join_event` could over-commit tokens under concurrency**: the balance-vs-holds check was a
  read-then-write with no lock. Now serialized per member with `pg_advisory_xact_lock` (members
  stay fully parallel).
- **PostHog duplicate init**: the new provider double-initialized `posthog-js` (the real init
  lives in `instrumentation-client.ts`). Provider removed; the real init now reads the canonical
  `NEXT_PUBLIC_POSTHOG_KEY` (legacy alias `_PROJECT_TOKEN`) and defaults the host to PostHog US
  cloud — the missing host was why analytics never fired.

### Changed

- `parseTokenAmount` extracted to `utils/token-amount.ts` (shared by the webhook credit path and
  its unit test).
- CI runs `pnpm test` on Node 24 alongside lint + build; `fixtures/node_modules` gitignored.

## [v1.0-den-locked] — 2026-08-04

### Added

- **The Lions Den** (`/owner`): the owner cockpit — Mint (presets + bundle builder), announcement
  board, model failover, floor closures, pulse metrics, events/ledger/catalog boards, the 🛡️
  Safety Desk (human confirm loop for DateSafe), the banned-account registry, engine kill-switch.
  Footer link; the lock screen is an open door — anyone can leave a message for the owner.
- **DateSafe**: report → immediate photo hold → OpenRouter vision review → clean lifts /
  violation keeps / inconclusive escalates to the Den. Every ban human-confirmed.
- **Ban registry** (`banned_accounts`): consulted at signup and sign-in; Den can ban/pardon.
- **Resend mail**: welcome (verification), apology (report cleared), ban notices —
  routed to `info@smartscott.online`.
- **Floor marquee** (`announcements` + `AnnouncementBanner`): ticker/roll/fade under each
  floor's name; posted from the Den.
- **Bundle swag codes**: one code delivering tokens + gifts + membership atomically.
- **The Exchange** (`/store`): cards + token packs via embedded Stripe checkout.
- **CI gate** (lint + build + gitleaks), executive audit at this commit.
- Signup honeypots + bot activity guards (messages/likes/waves/event entry).
- Identity (Gentleman/Lady) + dating preference at signup; mutual-compatibility filtering.
- PostHog analytics integration (`instrumentation-client.ts`).

### Fixed

- Every inside-club exit returns to the floor you came from (`cc_last_floor` cookie).
- Account membership card is tier-aware (grants, not just subscriptions).
- 1000-token bundle was recurring in Stripe — corrected to one-time.

## [v0.1-dance-floor] — 2026-08-01

### Added

- **The Event Engine**: hourly playlist — Dance Floor (:00), Themed Night (:15), Speed Dating
  (:30), Rooftop (:45); token holds (reserve, not debit), grid/rotation mechanics, instant
  mutual match, the song phase, no-match auto-refund.
- Tiered messaging caps (Silver 30/5, Gold 75/15, Platinum unlimited/40, Diamond unlimited/100)
  enforced in the `send_message` RPC — messaging is never for sale.
- Entitlements (unified tier resolution, guest passes, complimentary grants).
- Webhook idempotency (`mark_webhook_processed` — a replay can never double-grant).

## [v0.1-floor-1-locked] — 2026-07-31

### Added

- **The club floor (Phase 1)**: signup with 18+ gate, retention picker, terms/privacy consents;
  Stripe Identity verification (ID + selfie, 18+ gate, result-only storage); profiles with
  photos (3-cap in DB); browse & match (likes, instant mutual match); chat & messaging with
  safety (report/block); token ledger (verification bonus, server-side only).
- RLS on every table; governance layer (terms, privacy, safety, retention, refunds) binding on
  the build.

---

_Format: milestone-shaped during build-out. Before any release, entries above roll into the
release heading with a date. Keep entries to what a user or operator would notice — "what and
why", not how._
