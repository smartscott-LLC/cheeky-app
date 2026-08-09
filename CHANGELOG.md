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
- **Lighthouse pass**: Stripe's checkout is now lazy-loaded (`next/dynamic` in Pricing + the
  Exchange) — 265 KiB + the two longest main-thread tasks were loading on the landing page for
  every visitor; it now loads only when a price is picked. Responsive image variants
  (`scripts/resize-art.mjs`): navbar/footer logo 206→3 KiB, hero entrance 206→70 KiB, landing
  floor cards ~170→42 KiB each (full-res kept for the room backgrounds).
- **PostHog removed entirely** (founder's call — underused, heavy, and the config headaches
  weren't paying for it): `posthog-js`/`posthog-node` dropped, all capture/identify calls and
  the client init gone, env vars + docs cleaned. Sentry stays for errors; Stripe + GA can cover
  analytics when we actually need funnels.
- **Swag codes hardened** (founder): every code now defaults to a **30-day window to be
  used** (redeem already refused expired codes — minting just never set one), and gift codes
  **fail closed** if the item was renamed/deactivated after minting (`gift_unavailable`, never
  a silent NULL-catalog_id inventory row — no partial grants). The Owner's Booth surfaces
  unredeemed stale codes via the new `swag_codes_stale` view.

### Added

- **Blind Date (Gold floor, host-driven)** — the first of the founder's gender-defense
  events (PRD-event-logic §3): a real woman chooser launches a room (Gold+, never bots), up
  to 5 suitors buy a seat (15 tokens — pay for a chance). She types her own questions; the
  minute hand runs the round clock (1 min question → 1 min answers → 1 min selection, 4
  rounds + a tiebreak final); one tally per round, most tallies wins the date (winner matched
  + conversation, chooser plays free, suitors pay at resolution). Host failure (never a
  question or never a single tally) cancels + refunds everyone. Fully exercised by the live
  suite.

### Added

- **Blind Date UI** — the playable rooms for the Gold floor's host-driven event: her
  table (suitors blurred, her question box, answers under each face, one mark per round,
  the standing), their room (she's visible in-game, the live question, their answer box,
  who's leading — never what they said), the lobby (host the room or take a seat, no host
  preview until you're in), and cards in the Event Center + Gold floor. Phase clocks run
  the 60-second rounds live.
- **Themed Night retires from the wheel** — the Gold slot is now Blind Date (host-driven,
  not clocked): `ensure_floor_events` stops minting it, `KIND_META`/floor/copy updated,
  open leftover slots cleared. The grid engine still supports the kind (mechanics stay
  tested).
- **The Rooftop is the pool now** (PRD-event-logic §5): a closed bracket of up to 10 on
  the Diamond floor — 10-second rounds, three picks each, mutuals match and are escorted
  off the board (visible, the pool needs a board that shrinks), rounds repeat until
  everyone's matched, and the final 1v1 auto-matches. A dedicated 10-second cron
  (`cheeky_rooftop_tick`) drives the clock — the minute hand no longer treats rooftop as
  a grid room. Everyone who matches pays the 40; an odd leftover (nobody left to pair
  with) is refunded. New pool room at `/events/rooftop`.
- **Membership token grants** (PRD-event-logic §7): every paid membership comes with
  tokens every cycle — Gold 100, Platinum 200, Diamond 500 — granted by the subscription
  webhook (active + trialing), idempotent per subscription + period + tier (renewals and
  mid-cycle upgrades land their grant; the created/updated/checkout triple-fire can't
  double-grant). Tier resolved from the synced Stripe catalog; pure mapping
  unit-tested.
- **The Tiki Taskbar** (PRD-tiki-taskbar): the universal to-do bar — hard-capped daily allowances only (messages left 30/75/∞/∞, new people left 5/15/40/100,
  Matchmaker plays 2/3/4/5 once it ships, the coat check). Token-spend items never appear —
  the bar never regulates the wallet. Gold rounded bar, teal Damion counts (∞ for
  unlimited), gold Fascinate heading, pink caption; collapse / move top-bottom / hide per
  device; guest tier gets the 🪪 Get-your-card tile. Backed by the `taskbar_state` RPC and
  `messages.read_at` + `mark_conversation_read` (chat list now shows gold unread pills).
- **Tiki Taskbar v3** (founder's rule pass): the bar now carries EVERY hard-capped
  non-hourly allowance — **SPARX** (the Spark List is renamed — Swipes ⚡, L³ 💞, and
  Matchmaker 🎯 all get tiles; the 2/3/4/5 dial shows live), **Blind Date** (❤️, Gold+,
  new 2/day join cap enforced in `join_blind_date`), **Gifts** (🎁, 1/hour — shows
  minutes-to-ready while cooling), plus Chats and Coat Check. Hourly events and pure
  token items stay out. The bar docks **bottom-left at 1/3 width**, compact, with the
  label centered over it.
- **The test crew is live** — 22 dummy members seeded (`dummy.a-v@clubcheeky.test`,
  WebP avatars from `dummy_images/`), the founder's account flagged, and the profiles
  SELECT policy now guards `test_member` at the RLS layer (only test-flagged callers
  see them — verified: a normal member sees 0). Seed script fixed: proper createUser
  destructure, auth-admin owner lookup, deterministic storage keys.

### Fixed

- **The minute hand never ran — `finalize_events` was dead on hosted** (found by the new
  events suite): PL/pgSQL declared `e record` while the body aliased `public.events` as `e`,
  so every run raised `record "e" is not assigned yet`. The minute cron had failed every
  minute since the floor playlist shipped — 268 events sat in `open`, none had ever
  transitioned (no round ever started, no hold ever released). The record variable is
  renamed (`v_event`) so the table aliases win; the backlog swept to `canceled`, the cron is
  green, and the wheel now actually turns.
- **Speed Dating never settled — everyone's 25 tokens were held forever** (found by the
  events suite): `resolve_speed_dating` created matches + certificates but never converted
  holds to spend or released them — every entry stayed `reserved`, tokens locked
  indefinitely. Now: **full 1–5 ranking** (rank everyone you met, not top+alternate),
  **greedy strongest-mutual matching** (lowest rank-sum pairs first), and
  **pay-for-the-opportunity settlement** — every participant's hold converts to the 25
  token spend at resolution (no refunds; canceled events still refund). Idempotent.
- **Date Night could never score** (found by the events suite): the round resolved on the
  FIRST partner's tap (the other's unanswered pick read as a skip), advanced the question,
  and the partner's tap landed on `question_not_live` and was silently dropped. Now the
  round waits for both partners: mutual same-option locks + scores, a skip on either side
  closes it as missed, differing picks keep the huddle open. Also fixed the dead-code uuid
  cast in the scoring path (`->>` instead of `->` + `::text`) that would have crashed the
  first correct answer.
- **L³ could never settle a mutual pick** (found by the new L³ suite): `create_l3_pick`
  raised `42702 column reference "match_id" is ambiguous` the moment two members liked each
  other back — the `RETURNS TABLE (match_id, …)` output parameter collided with
  `l3_rewards.match_id` in the `ON CONFLICT` column list. The match path had never been
  exercised end-to-end (single picks never reach it). Fixed by targeting the unique
  constraint by name; the RPC JSON contract is unchanged. T1/T2 tiers, the free line, the
  T2 gift + announcement, and Leave-silent are now all proven live.
- **Live-test cleanup silently failed for ~5.6k throwaway members**: the Stripe template's
  signup trigger creates a `public.users` row (NO ACTION FK on `auth.users`), so GoTrue
  `deleteUser` 500s until it's gone — every live suite's teardown was swallowing that and
  leaving members behind (`toktest-` ×3,930, `evttest-` ×1,607, others). Suites now delete
  the `users` row first, surface teardown failures loudly, and the accumulated throwaways
  are purged. `scripts/seed-test-members.mjs --remove` fixed the same way.
- **Storage bucket listing hole closed** (Supabase lint 0025): the `profiles` bucket was
  public (by design — object URLs serve photos) but the "Read profile photos" SELECT
  policy let **anyone enumerate every member's photo keys** via the Storage API. Dropped
  the broad SELECT; upload/update/delete stay scoped to the member's own folder, URLs are
  built from known `storage_path`s (`/storage/v1/object/public/profiles/...`), and nothing
  in the app lists the bucket. Applied to hosted (`20260808078000_storage_no_listing.sql`).
  The last remaining security-advisor warning is leaked-password protection — a dashboard
  toggle that requires Supabase Pro.

### Added

- **Index Advisor enabled**: `hypopg` (hypothetical indexes for EXPLAIN-only planning) and
  `index_advisor` (Supabase's index-recommendation function) installed into the `extensions`
  schema — the same thing the dashboard's enable button runs. Both are passive analysis
  tools, zero runtime cost. DB health today: 99.99% cache hit, ~10 rows/call, and the
  dashboard's "25 slow queries" are all platform introspection (timezone/extension catalogs,
  backups, table browser) — the app's own queries don't appear.
- **Matchmaker is live** — the third spark mode on `/browse`, the memory game that unlocks
  first impressions (PRD-matchmaker.md, DRAFT → BUILT). Draft two faces from your floor or
  beneath, then play a 4×4 board (8 people, 2 cards each): matching a pair earns one
  first-impression message to that person — even if they never liked you back. 2 matches
  win, 3 strikes lose; plays/day dial 2/3/4/5 by floor via the `matchmaker:` rate-limit
  namespace, and unlocks ride their own allowance (never the 5-new-conversations cap).
  The decline economy (founder): a decline stays silent for the recipient, but the sender
  is told — gift-wrapped — and earns a **Matchmaker-exclusive gift** (one per floor, never
  purchasable: The First Spark / Golden Ticket / Platinum Pass / Diamond Key) into their
  inventory; accepting earns the recipient the sender-floor variant, the collectible pull
  to accept cross-floor. The rebound engine, first implementation. Server-authoritative
  flips (cards are deny-all at RLS — the client only sees what `matchmaker_flip` reveals),
  taskbar shows plays left, and `scripts/purge-mmtest.mjs` is the safety net for interrupted
  live runs. **10/10 live tests green** + L³/taskbar suites re-verified.
- **Tiki task bar diagrams** (`docs/event-diagrams/`): the founder's `.mmd` source and `.pdf`
  export now live in permanent repo storage instead of the repo root.
- **Event-kind live suite** (`tests/events.live.test.mjs`): the hourly wheel (all four kinds
  on the quarter + scheduler liveness), mutual-pick → match → debit for every grid kind
  (dance_floor / themed_night / rooftop), and `finalize_events` under load (N members, one
  cycle, all holds released, ledger untouched — deterministic: the event lives inside a
  rollback transaction so the live minute-cron can't race it). Run with `RUN_LIVE_TESTS=1`.
  **Fully green (8/8)** including the speed dating settlement and Date Night mutual lock
  (see Fixed).
- **Refined event logic spec** (`docs/PRD-event-logic.md`): the founder's locked decisions —
  refunds on the Dance Floor only, Blind Date (Gold), Speed Dating "pay for the
  opportunity" (full 1–N ranking, charge after selection, claims path), the Rooftop
  multi-round pool, Icebreakers (Date Night) category, and monthly membership token grants.

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
