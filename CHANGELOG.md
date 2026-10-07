# Changelog

All notable changes to Club Cheeky. Follows [Keep a Changelog](https://keepachangelog.com/); the
project is in build-out, so this is milestone-shaped rather than semantic-version-shaped.
Milestone tags (`v0.1-floor-1-locked`, `v0.1-dance-floor`, `v1.0-den-locked`, …) are the save
points — every push to `main` is production.

## [Unreleased]

### Added

- **CUTOVER — the club left Vercel (2026-10-07).** Founder routed `www.smartscott.online` through the `ivy_k8s` tunnel; public traffic now lands on the Ivy pods end-to-end: landing 200, gates 307, lounge 200, Square webhook door 405-on-GET, zero `x-vercel` headers in responses. Vercel stays warm as pure fallback until founder pauses the club + chub projects deliberately; rollback = delete the www public hostname.

- **The grand entrance** — `entrance_v2.mp4` (2.78 MB, founder-optimized) uploaded to `cheeky-assets/video/` (bucket MIME widened for video/mp4), registered in the asset manifest (160 assets) + `ASSETS.video.entrance`. New `EntranceOverlay`: velvet ropes part, doors swing, music starts — plays once per browser session when a member arrives at the lobby via `/club?enter=1` (the URL for the Square "Enter Club Cheeky" button + confirmation email). Audio-first with graceful muted fallback ("🔊 Tap for the music"), always-skippable, auto-dismisses on end and strips the param. Lint gate caught a setState-in-effect on the first pass — fixed by letting `router.replace` unmount it instead. **Didit workflow re-pointed** to `e53ce2d4…` ("Fast ID check", rebuilt for two-state compliance + the 50% ruling) in `.env.new`, code fallback, and Vercel.

- **Didit KYC wired end-to-end — the door check is live.** `utils/didit.ts` (server-side session create: workflow + `vendor_data = club user_id` as the join key + callback to `/verify?checked=1`), `/verify` actions swapped from Stripe Identity → Didit at both seams (`checkInAtTheDoor` for new signups, `startVerification` for mid-flow members), and `POST /api/webhooks/didit` — the authoritative decision channel: canonicalisation (shortenFloats→sortKeys) → HMAC-SHA256 X-Signature-V2 → 300s freshness → constant-time compare → `event_id` idempotency → case-sensitive status dispatch. Approved → `applyDiditVerification` (idempotent +20 bonus, badge, moment, welcome mail, `verified_at`, `profile_private` provider `didit` + birthday lifted straight from the signed `id_verifications[0]` — no provider round-trip) → manifest mirror. Declined → existing 3-strikes human-escalation. Callback redirect is treated as pure signage, never proof. Secrets `DIDIT_API_KEY`/`DIDIT_WEBHOOK_SECRET`/`DIDIT_WORKFLOW_ID` synced to Vercel. **Caught a live landmine:** the integration prompt's workflow id (`a816e112…`) was a stale template placeholder — `GET /v3/workflows/` proved the real "Compliance workflow" is `75dba526…`; code uses the verified id (env-overridable). Canonicalisation + gate tests added; suite → 65.

- **Square register line wired end-to-end** — `store_purchases` ledger (migration `20261005000001`; every order recorded, incl. the $0 Silver pass-through — Silver is the ground so it records without an entitlement; `UNIQUE(order_id, sku)` is the idempotency lock that doesn't trust the webhook layer), `utils/square-webhook.ts` (pure: Square HMAC signature scheme — URL+timestamp, base64, constant-time, 300s freshness — and the ITEM_LIBRARY contract: 11 SKUs, memberships 30d/full tokens, trials 7d/pro-rated 30-90-300, token bundles, gift sets), and `POST /api/webhooks/square`: verify → dedupe via `webhook_events` → fetch order → buyer email → club account → grants (entitlement + tokens per contract) → manifest mirror. Unknown buyers and gift sets are recorded and logged LOUDLY for owner-tools, never silently dropped. 6 contract tests (signature round-trip/tamper/staleness, every SKU, trial pro-rating, silver-is-ground). Suite 58 → 64.
- **Manifest membership section — second domino** — `utils/membership-manifest.ts` mirrors `current_tier()` (the single authority: subscriptions + entitlements + guest passes) + `verified_at` + guest-pass expiry into `manifest.membership`, wired at all four state-change doors: verification (admin.ts), subscription webhooks (admin.ts), complimentary grants + guest passes (account actions). The read door overlays the LIVE tier on any membership display — guest passes expire silently, so the mirror is the view and `current_tier()` is the vote. `scripts/backfill-manifest-membership.mjs` seeds merge-safe (`--user <prefix>` supported). +1 mapper test (standard→silver normalization, unknown floors fall to the door tier).
- **Upgrade aftermath, caught and fixed** — the Supabase engine update silently re-granted anon EXECUTE on `taskbar_state()` (undoing part of the security hardening). Migration `20261003000001` re-revokes; standing post-upgrade check recorded: anon-executable DEFINERs must be exactly `is_test_member`. Verified the 30 functions lacking authenticated EXECUTE are all service-only-by-design (every app call site goes through `supabaseAdmin`).
- **Backfill hardening (found mid-run)** — both backfill scripts treated ANY existing-manifest download failure as "no manifest," silently overwriting live documents on a transient hiccup (it cost Scott's profile section for ten minutes — restored by re-run, which merged cleanly). Now: 404 → fresh skeleton; any other error → SKIP the member, never overwrite.

- **Bio Card wears real club art** — the 162 custom icons, not emoji. `utils/badge-icons.ts`: badge_catalog slug → badge-art mapping (verified→new_arrival, first_match→spark_finder, streak_7→vip_lounge, chat_1000→chat_champion, chat_hour→cocktail_bar) with honest emoji fallback where no art fits (pearl ≠ opal — no fake stand-ins), single source of truth for founder review. Membership corner now renders the tier badge icons (silver/gold/platinum/diamond_badge) floating above the frame; earned corner uses mapped art with the emoji chip as fallback. Display-badge slug flows through the coat-check card props.

- **Manifest profile section — the TOP's first living domino** — `utils/profile-manifest.ts` mirrors a member's profile + photos into `manifest.profile` after every write (updateProfile, upload, delete, set-primary — four seams, one best-effort helper; a failed sync never fails the member's save). The pure `profileToSection` mapping lives in `utils/top-schema.ts` (shared by live sync + backfill — one truth) with primary-first photo order and privacy-first defaults (show-flags OFF, no invented age). `scripts/backfill-manifest-profile.mjs` seeds every member (merge-safe: existing manifests keep their other sections; `--user <prefix>` for single runs). Coat-check card now reads manifest-first with table fallback (strangler pattern: tables keep feeding queries/joins while the manifest becomes the canonical member view). +2 mapping tests (one caught the docstring/impl drift and the implementation was fixed to match the spec). lint 0/0 → pretty → lint 0/0 → 51/51 tests → build green.

- **THE TOP — Top Of Pyramid — manifest control plane** (docs/PRD-user-manifest.md, founder architecture): `utils/top-schema.ts` (pure geometry — v1 types, seven section validators, uuid cross-check, 60/30d match + 30d event window trims, v0→v1 upgrade, sub-address resolution, master-directory entries) + `utils/top.ts` (the router — `topGet(userId, subaddresses)`, `topPut(userId, section)`, `addMatch`/`addEvent` appenders, `saveAvatar` maker door, TTL cache, `_master.json` directory behind the interface). Read door rewritten as sub-address projections (`?fields=profile.displayName,membership.tier,…`) with privacy gating AT THE APEX (age/height/location only returned when the member's show-flags allow) and a card-safe allowlist; save door now folds the v0 avatar contract into v1 model+assets. Coat check reads through the TOP. `utils/user-manifest.ts` (v0) retired. 11 new geometry tests (`tests/top-schema.test.mjs`) — suite now 49 pass. Pipeline clean: lint 0/0 → prettier → lint 0/0 → build green → dev-run smoke (read door 404-no-manifest, illegal sub-address rejected, save door session-gated). Local commit only — no push until launch-ready per founder's Vercel-minutes rule.

- **User-manifest substrate + Bio Card, implemented from the contract** (PRD-avatar-maker) — `utils/user-manifest.ts`: typed v0 schema, strict validator (version/userId/lengths/hex/https/1 MB cap), service-key read/write against the private `user-manifests` bucket with a 30 s TTL cache, and the **master manifest** (`_master.json` index → per-user manifest pointers, the vector-DB-ready substrate). Two doors: `POST /api/avatar/save` (session-gated single write door — validate, write user object, update master) and `GET /api/avatar/{userId}` (card-safe read, edge-cached 60 s + SWR). `components/ui/Cards/BioCard.tsx`: the founder's baseball-card doctrine — collectible card back flip (heart/gender-mapped), photo in frame, Fascinate/gold section labels, Rancho/pink body, Damion/cyan stats, avatar slot floating bottom-right with text padding against it, membership + earned badges floating above the borders. First surface: **coat check** renders your own live Bio Card (profile + primary photo + tier + badge + manifest). Storage round-trip smoke-tested clean; lint 0/0, build green, 38 tests pass.

- **The club moved onto Ivy (pre-cutover)** — `Dockerfile` (three-stage pnpm build → standalone server, non-root) + `.dockerignore` + `platform/ivy/club.yaml`: image built on the laptop, ferried via `docker save | ssh | k3s ctr images import`, runtime secrets from a k8s Secret generated on-box from `.env.new` (never committed). The `chub: link:../chub` dep (Vercel microfrontend glue, zero code imports) is stubbed inside the build so the frozen lockfile installs clean. `next.config.ts` gained `output: 'standalone'` (Vercel ignores it). Deployed to namespace `club` with an Ingress on `www.smartscott.online` — dormant until the DNS flip, Traefik-ready the moment it isn't. Verified on Ivy: `/` 200 with real Club Cheeky HTML, `/club` 307 auth gate, `/api/webhooks/square` 405 on GET (doors closed). Maker rebuilt too: its first deploy shipped with **no runtime env at all** and quoted `NEXT_PUBLIC_*` baked into the bundle.

- **Cookie bridge armed on our own metal** — `NEXT_PUBLIC_COOKIE_DOMAIN=.smartscott.online` added to `.env.new`, baked into both images (Next inlines `NEXT_PUBLIC_*` at build time — a runtime-only set would have silently no-opped), secrets refreshed, both deployments rolled. Full sign-in → maker round trip awaits the cutover test.

- **The lounge moved to Ivy the honest way** — chub `Dockerfile` + `.dockerignore` + `platform/ivy/lounge.yaml`. No base-path surgery: the container serves `basePath: /lounge` exactly as Vercel's microfrontend routing did, and a Traefik `IngressRoute` (host `www.smartscott.online`, `PathPrefix(/lounge) || Path(/lounge)`, priority 100) splits `/lounge/*` to the lounge pod from the club's catch-all. Found the hard way: **Traefik v3.7 renamed the IngressRoute `rule` field to `match` and its PathPrefix is segment-strict on the bare path.** Verified: `/lounge` 200, `/lounge/` 308-canonical, OAuth callback route answers.

- **Smartforms is live on Ivy with the engine untouched** — `form-backend/Dockerfile` (pnpm-built, `server.js` byte-identical per founder law; the compose-era `npm install` at container start and the stack's own traefik + already-dead metabase are retired), `platform/ivy/forms.yaml`: pgvector 16 (k3s pulls from the registry itself — don't air-ferry) on a PVC + forms-app + `forms.smartscott.online` Ingress. Data migrated (`pg_dump` → restore; `/__health`: database connected, `form_submissions` present, discovered forms [cheeky, index]). Public hostname still rides the old laptop tunnel — one founder edit away.

- **Entrance video pulled (founder call)** — `EntranceOverlay.tsx` and its wiring deleted; bucket asset + registry entry stay for a comeback. Also removed the stray prose sentence that had been rendering in the lobby since 81345e2 ("I'm just going to position it on the same area." — a pasted thought living in JSX, shipped to every member).

### Fixed

- **Estate hygiene sweep (founder law: pnpm only, no stubs, no placeholders)** — dead `chub: link:../chub` dependency deleted properly from club `package.json` + lockfile (not stubbed); inert `"npm": { onlyBuiltDependencies }` blocks deleted from club + chub `package.json` (the pnpm `allowBuilds` lists already govern); wizard-era `.eslintrc.json` removed (untracked debris — the linter is oxlint/biome, never eslint); chub `pnpm-workspace.yaml` placeholder `stream-chat: set this to true or false` replaced with the actual policy (`true`, matching club's allowlist); chub lockfile regenerated against its override config; smartforms' `package-lock.json` replaced by `pnpm-lock.yaml`. Also documented: the club repo's default branch is `master` and `origin/main` is a zombie 64 behind — Vercel deploys `master` (proven by features going live), AGENTS.md's "main" is drift; flagged for founder to delete the zombie branch.
- **Portainer 403 — cured at the root, not the symptom.** The 403 was the CE first-run admin window (5 minutes after boot, then locked forever — restarts just re-rolled the dice). Platform now seeds the admin from `--admin-password-file` at every boot: restart-proof, login API-verified (JWT), served plain HTTP on LAN `:30000`. Found the flag truth from the binary's own `--help` (`--host` = environment to manage, not a listen flag) after two wrong guesses crashed the pod — recorded lesson: read the artifact, don't recall the docs. Agent RBAC pre-created; environment add is one wizard click (the endpoint API rejects every payload shape — CE quirk, not worth archaeology).
- **OBS wall starts earning its screens** — Netdata DaemonSet (`monitoring` ns, hostNetwork :19999, LAN-only): RAM/CPU/disk/network/containers + ML anomaly detection on the big browser. k8s trap found: mounting `/dev` breaks runc's termination-log; dropped it, netdata degrades gracefully.
- **`.env.new` quote rot + tunnel scheme — the two-headed "502 vs works-for-you" mystery** — the rotated Supabase/Postgres block carried literal double-quotes in `.env.new`; docker `--env-file`, `kubectl --from-env-file`, and Next's build-time inlining all pass quotes through as content, poisoning `NEXT_PUBLIC_SUPABASE_URL` (every page 500'd with "Invalid supabaseUrl"). Sanitized in place + derived clean copies for image builds and Secrets. Second head: Cloudflare tunnel public hostnames were saved as `https://localhost:80` — TLS knocking on Traefik's cleartext port → 502 to the world, while founder's browser (cached 308 root→www from the pre-tunnel era) never touched the broken road and everything "worked fine." Scheme corrected to `http://localhost:80`; both roads then proven live: apex 302→www→200, `maker.smartscott.online` 307→club sign-in from the open internet.
- **The 60-warning advisor list, resolved by doctrine** — audit found every warned DEFINER already search_path-pinned and postgres-owned (the menu's hygiene bar was met). The one genuine fix: `is_test_member()` had ZERO RPC call sites and exactly one RLS policy consumer — moved to a non-exposed `guard` schema (migration `20261004000001`), clearing both of its warnings while the privacy gate stays enforced (policies bind by OID; anon profiles read verified working, `/rest/v1/rpc/is_test_member` verified gone). The remaining 58 are the declared member-facing RPC spine — now enforced by `scripts/audit-definers.mjs` + `config/definer-api.json`: any callable DEFINER not deliberately allowlisted, unpinned, or non-postgres-owned exits 1. Run after every Supabase upgrade (the 2026-10-03 upgrade re-granted anon on taskbar_state — that class of drift is now machine-caught, not memory-caught).
- **PWA boot-flicker + stale-shell loop + credential-in-URL fallback** — Chrome served a cached sign-in shell from an old build whose JS chunks 404'd after deploys; with no JS the auth forms degraded to native GET submits, putting email+password in the URL. Three layers fixed: (1) `public/sw.js` rewritten — cache version bumped to v2 with old-cache deletion on activate, hashed `/_next/static` chunks cache-first (immutable), HTML navigations network-only (a stale shell can never cross deploys again); (2) `app/manifest.ts` was lying — both icons declared 192/512 were actually 96×96 files (Chrome's "typo in the Manifest"), now real `icon-192.png` (key-logo upscale) + `icon-512.png` (entrance-arch crop) generated with sharp and uploaded to the bucket; (3) all five credential forms (`PasswordSignIn`, `EmailSignIn`, `Signup`, `ForgotPassword`, `UpdatePassword`) carry `method="post"` so a no-JS submit can never leak credentials into URL/history/logs. 165-rule lint 0/0 → prettier → lint 0/0 → build green → 51/51 tests.
- **Security-advisor hardening** (found via founder's `supabase_warnings_needing_fixed.txt` scan; plus the rotation rescue below) — revoked anon EXECUTE on the 22 SECURITY DEFINER RPCs the advisor flagged (club_chat/matchmaker family, `taskbar_state`, `use_icebreaker`, `insert_challenge_leaderboard`); every one of these is session-only at the call sites, members keep access via `authenticated`, and the two ops/trigger internals (`rls_auto_enable`, `on_subscription_activate`) were locked to service-role only. Pinned `search_path` on `handle_new_user()` + `use_icebreaker()` (lint 0011). Dropped the broad "Read cheeky-assets" `storage.objects` policy (lint 0025 — public bucket URLs verified unaffected, zero list() callers). Migration `20261001000003` records the 0029 decision (58 authenticated-DEFINER warnings = the app's by-design RPC spine, each enforcing auth internally). Post-checks: anon REST reads work, `taskbar_state` 401s for anon, exactly one anon-executable DEFINER remains and it's `is_test_member()` — required by RLS policy evaluation.
- **Key rotation aftermath** — founder rotated all Supabase secrets (~10:12 CDT) into `cheeky-app/.env.new` + `chub/.env.local`. Two casualties found and fixed: earlier revoke tooling had also clipped `is_test_member()` from anon, 401-ing every anon table read before it went wide (grant restored, policy-function sweep verified it was the only one); Vercel envs still held the dead 20-day-old copies — all 6 Supabase vars replaced on both projects and 14 stale `POSTGRES_*` secrets deleted; both projects redeployed and verified (live bundle carries the new key, lounge health `{supabase:true, admin:true, stream:true}`). The three `gen-*.mjs` advisor-remediation scripts had the same `env.new` missing-dot bug as generate-types — fixed. New DB password confirmed working against local tooling.
- **Restored `rate_limits` + `club_announcements` — silent production breakage found in the full_cheeky archaeology** — the 2026-09-22 `cleanup_database.sql` sweep (kept in the `full_cheeky` toolbox repo) dropped both tables as "0 rows," but live code had been writing them since: every horn purchase and chat horn failed (`bump_rate_limit` threw → cooldown guard treated null as "denied"), swipe daily caps fail-opened (null ≠ false), the ⚡ taskbar RPC errored on every call, and gift/horn ticker inserts went nowhere. Migration `20261001000002` recreates `rate_limits` (shape reverse-engineered from the deployed `bump_rate_limit`/`taskbar_state` bodies — it was never in a committed migration) and `club_announcements` verbatim from `20260914000001`, and widens the `bump_rate_limit` key allowlist (since `20260912000000` it only knew `agent|report|matchmaker|l3`, never the `horn:`/`swipes:` families the code later shipped). Verified live: cooldown bites on second call, `taskbar_state` returns a Diamond member's real counts, announcement insert/select round-trips. `types_db.ts` regenerated; lint 0/0, build green, 38 tests pass.

### Removed

- **Quest-engine debris purged from Supabase + app** — the 2026-09 avatar attempt is fully retired ahead of the mini_model_maker integration (which brings its own manifest-per-user design). **Storage** (via Storage API — Supabase guards `storage.objects`/`storage.buckets` against SQL): `quest-assets` purged (845 GLBs + `test-upload.txt`) and dropped, `quest-avatars` purged (4 test renders) and dropped, empty `ui-assets` dropped. Keepers verified untouched: `user-manifests`, `profiles` (incl. `test-members` for game testing), `cheeky-assets` (icons/personas/brand). **Schema**: migration `20261001000001_scrap_quest_debris.sql` drops `avatars` (2 null-user test rows with inline base64), `asset_catalog` (~1,730 `.vrm` rows, `url` never set), `quest_catalog`, `ui_catalog`, plus RPCs `add_asset_to_catalog`/`lookup_asset`/`get_assets_by_category`. **Code**: removed `app/quest/`, `app/api/quest/*` (8 routes), `components/ui/Quest/`, `AssetViewer/AssetPreview`, `utils/asset-catalog.js` (the baked 1.5 MB JSON), `utils/quest-storage.ts`, `utils/store/questStore.ts`, `utils/supabase/storage.ts`, `scripts/upload-glbs.mjs`; HUD lost the Quest quick-link and the dead Profile tab (`TabId` narrowed to daily/wallet/help). **Tooling bugs found in the rubble**: `migrate-hosted.mjs` treated failed migrations as applied forever (skip-set now respects the `success` flag) and `generate-types.mjs` loaded `env.new` instead of `.env.new` (silent no-env). `types_db.ts` regenerated; lint 0/0 (227 files), build green, `pnpm test` 38 pass.

### Added

- **Swipe daily limits** — Swipes (Likes) now have daily caps: silver=15, gold=30, platinum=50, diamond=100. Enforced via `bump_rate_limit` RPC with key format `swipes:{user_id}:cst`. Taskbar shows remaining swipes in the ⚡ tile.
- **Blind Date host gender restriction** — Only female Gold+ members can host Blind Date events. Male Gold+ members can join as suitors but cannot host. UI conditionally shows host button based on profile gender.
- **Matchmaker History improvements** — Shows ALL activity including sent unlocks (waiting for reply), accepted matches (active chats), and declined unlocks. "Clear" button wipes completed boards from view. Summary chips show counts by status.
- **Taskbar auto-position in event rooms** — When on `/events/*` or `/floor/*`, the Tiki Taskbar pins to top-left for quick access. On normal pages it respects the user's saved position (bottom-center by default).
- **L3 card size reduction** — Cards reduced ~33% with `max-w-sm` container, smaller padding/gap/text sizes. Card backs use custom `collectible_card_back1/2.webp` images instead of 🎯 emoji. Cards maintain 2:3 aspect ratio (rectangular, like real cards).
- **CST midnight reset for all daily limits** — All daily counters (messages, swipes, matchmaker plays, blind date joins) now reset at midnight Central Standard Time (America/Chicago) instead of rolling 24-hour windows. Implemented via `taskbar_state` RPC using `(now() AT TIME ZONE 'America/Chicago')::date`.
- **Lounge (chub) inline auth** — the lounge entrance now has an inline sign-in / sign-up / magic-link form. No redirect to the main app's `/signin` page — the user never leaves `/lounge`. Auth endpoints at `/api/auth/signin`, `/api/auth/signup`, `/api/auth/magic-link`, `/api/auth/signout`, and `/auth/callback` (magic link landing).
- **Lounge coat check panel** — sidebar button fetches `/api/coat-check` and shows badges, gems, daily streak, and persona in a glassmorphism overlay.
- **Lounge challenge tables** — migration `20260903000001_lounge_challenge.sql` creates `challenge_queue`, `challenge_matches`, `challenge_leaderboard` with RLS and RPCs. Challenge handlers rewritten from in-memory to DB-backed.
- **Lounge ticker connected to live data** — reads main app's `announcements` marquee + `club_announcements` (horn/gift ticker) instead of static hardcoded array.

### Changed

- **Oxlint replaces eslint** — removed `.eslintrc.json`, all `eslint-config-*` / `eslint-plugin-*` packages. Linting is now `oxlint --config oxlint.config.ts` via `pnpm lint` / `pnpm lint:fix`. Type-aware rules, Next.js plugin, React plugin active.
- **Tailwind v3 → v4** — migrated from `@tailwind base/components/utilities` to `@import "tailwindcss"` + `@theme`. CSS modules use `@reference "tailwindcss"` for `@apply`. Brand palette trimmed to 3 colors (gold `#FFD800`, cyan `#66FFFF`, pink/club `#FF97FF`). Config files: `next.config.js` → `next.config.ts`, `postcss.config.js` → `postcss.config.ts`, `tailwind.config.ts` simplified.
- **`"type": "module"`** — package.json set to ESM mode. The 3 `.js` config files were renamed to `.ts` (native ESM compatibility).
- **TypeScript resolved to 0 errors** — went from 28 build errors to 0. Fixed photo relationship type casts across 15+ files, ESM import paths, missing imports (`localFont`, `Github` icon), and type narrowing.
- **Schema fix: missing `subscriptions.status`** — the live Supabase `subscriptions` table was missing the `status` column. Every RPC calling `current_tier()` crashed with `column s.status does not exist`. Migration `20260904000001_add_subscription_status.sql` added the column and backfilled existing rows to `'active'`.
- **AGNES/deepseek direct fetch** — `utils/agent/deepseek-direct.ts` rewritten to use direct REST fetch instead of the missing `createAGNES` / `streamText` SDK. Works with any OpenAI-compatible API key.
- **SPARX browse page fixed** — Photos query was broken due to missing Supabase relationship between `profiles` and `photos` tables (photos.user_id references auth.users, not profiles.id). Fixed by fetching profiles and photos in separate queries and merging client-side. Now shows all compatible verified members with photos.
- **Rate limit UI consistency** — When any daily limit is hit (swipes, matchmaker, L³), UI shows graceful "⏳ Waiting on refresh…" state instead of error messages. Added `isRateLimitError()` utility and `RATE_LIMIT_ERRORS` set in `utils/rate-limit.ts`.
- **Chub middleware fixed** — Renamed `proxy.js` to `middleware.js` (Next.js only recognizes `middleware` export). Session refresh now runs properly, fixing the sign-in loop issue.
- **Stream Chat channel auth fixed** — Channels were created without adding the user as a member, causing 403 Forbidden errors. Now includes `members: [userId]` on creation and falls back to `addMembers` on error 70.
- **Chub manifest CORS fix** — Service Worker precaches `/lounge/manifest.json` which was being redirected by middleware (no session cookies in SW context). Added `.json` exclusion to middleware matcher.
- **Admin key regenerated** — New 128-char hex key generated and pushed to Vercel production.
- **Migration tracking restored** — Synced hosted DB migration tracking to 94 entries. Fixed `migrate-hosted.mjs` script to read `.env.new` (was `env.new`) and skip already-applied migrations.
- **Lounge (chub) session sync** — Both apps now force `path: /` on Supabase cookies so the session is visible across the microfrontend boundary.
- **Lounge API URL prefix** — all client-side API fetches in page.js prefixed with `/lounge` (`const B = '/lounge'`) so they hit the chub's route handler instead of the main app's (which returns 404).
- **Lounge PWA paths** — manifest URL set to `/lounge/manifest.json`, SW scope set to `/lounge/`, SW precache updated, fetch handler matches `/lounge/api/` for network-first strategy.

### Fixed

- **`next build` without runtime secrets** — module-level SDK construction threw during page-data collection on a fresh clone (no `.env.new`): `utils/supabase/admin.ts`, `lib/stripe.ts`, and `utils/datesafe.ts` now build their clients lazily on first use with clear missing-env errors, and `utils/email.ts` defers `new Resend()` to send time (matching the entry below, which had regressed). `Avatar3D`'s not-yet-published Genies SDK import gets `turbopackIgnore`/`webpackIgnore` so it no longer warns. `pnpm-workspace.yaml` had a literal `set this to true or false` placeholder for `better-sqlite3` — set to `true` so installs stop failing with `ERR_PNPM_IGNORED_BUILDS`. Also fixed `AssetPreview.jsx` (missing `useEffect` import, invalid TS generics in `.jsx`, stale-state-on-url-change instead of synchronous setState in effect, and reading a nonexistent `window.ASSET_CATALOG` when the catalog arrives as a prop) and removed dead code in `scripts/upload-glbs.mjs`. `pnpm lint` and `pnpm build` now pass with zero warnings.
- **instrumentation.ts Edge warning** — Replaced `path.resolve(__dirname, ...)` with `import.meta.url` string ops to avoid Turbopack Edge Runtime warning.
- **Resend env handling** — Deferred `new Resend()` instantiation to request time in `utils/email.ts` to prevent build failures when `RESEND_API_KEY` is absent.
- **Lobby back button** — Added gold-bordered "Back to Lobby" button with cursive icon to lounge entrance and chat header. Glow animation on hover, scale on tap.
- **Blind date UI simplified** — Males see only "Join a room" option. Females see only "Host a Blind Date" option. Removed error message trap.
- **Test suite pass rate** — 65 pass / 28 fail → 76 pass / 15 fail. The `s.status does not exist` schema crash eliminated all ~13 failures. Remaining 15 are transient Supabase auth rate limits and event-scheduler timing windows.
- **Chatterbox badge count** — Stream webhook now calls `club_chat_bump_badges` for Stream-path messages (no double-count with the `club_chat_send` RPC). Lounge chatter feeds the badge family.
- **Lounge PWA paths** — manifest URL set to `/lounge/manifest.json`, SW scope set to
  `/lounge/`, SW precache updated, fetch handler matches `/lounge/api/` for network-first
  strategy.

### Fixed

- **Test suite pass rate** — 65 pass / 28 fail → 76 pass / 15 fail. The `s.status does not
exist` schema crash eliminated all ~13 failures. Remaining 15 are transient Supabase auth
  rate limits and event-scheduler timing windows.
- **Chatterbox badge count** — Stream webhook now calls `club_chat_bump_badges` for
  Stream-path messages (no double-count with the `club_chat_send` RPC). Lounge chatter
  feeds the badge family.

### Validation

- `pnpm lint` — **0 warnings, 0 errors** (oxlint, 215 files, 96 rules)
- `pnpm test` — 92 tests, 76 pass, 15 fail (transient)
- `pnpm build` — green, both apps (cheeky-app + chub)

## [v0.4-stream-lounge] — 2026-09-06

### Added

- **Stream Chat — the live transport** (PRD §4 — easier moderation,
  video/voice on the roadmap). The town square now runs on Stream
  Chat as the primary live surface; the Supabase-Realtime overlay
  stays mounted as the fallback when `STREAM_API_KEY` /
  `STREAM_API_SECRET` are absent or the Stream call fails. The
  feature flag resolves client-side at mount time, so the fallback
  is automatic — no deploy needed to switch back.
  - `stream-chat@9.52.0` + `stream-chat-react@14.11.1` installed;
    `pnpm-workspace.yaml` allowBuilds updated for the build scripts.
  - `utils/stream/server.ts` — singleton server client, `streamEnabled`
    gate, `issueStreamToken` (upserts the user into Stream and signs
    the token with the server secret), `STREAM_ROOMS` registry,
    `ensureTownSquareChannels` (idempotent channel provisioning),
    `ensureWhisperChannel` (1:1 pair room).
  - `utils/stream/client.ts` — singleton browser client
    (`StreamChat.getInstance`), `connectStream` / `disconnectStream`
    wrappers used by the overlay.
  - `app/api/chat/stream-token/route.ts` — `POST` issues a fresh
    token for the signed-in member; mirrors the Supabase profile
    (display name + primary photo) into Stream on issue. Returns
    `{enabled: false}` when keys are missing so the client falls back.
  - `app/api/chat/stream-webhook/route.ts` — the production webhook
    receiver. Verifies the HMAC-SHA256 `X-Signature` on the raw body
    (gzip-aware, constant-time compare), then dispatches on
    `event.type` to mirror `message.new` into `club_chat_messages`
    and Horn messages into `club_announcements` so the moderation
    log + the 30-day purge keep working without a second client.
  - `supabase/migrations/20260808170000_stream_chat_mirror.sql` —
    adds `stream_message_id` (unique when present) to
    `club_chat_messages` so the webhook mirror is idempotent.
- **Stream-backed overlay — `components/ui/ClubChat/StreamChatOverlay.tsx`**
  - `StreamChatMenu.tsx` + `StreamChatWhisper.tsx` + `HornBurst.tsx`
  - `PresenceStack.tsx`. Custom UI built on the low-level Stream
    client (not the stream-chat-react component CSS), with the Cheeky
    visual system baked in: glassmorphism panel, gold/cyan glow,
    per-message entry animation (staggered, low-cost), animated tab
    transitions, animated presence stack with hover tooltips, confetti
  - 1.5s 🎺 stamp on every Horn, profile peek in the context menu,
    floor tag chips with the right palette per tier, typing
    indicators in whispers, slide-in whisper view, a "🎺 HORN" badge
    on horned messages. Falls back to the existing Supabase chat
    (`components/ui/ClubChat/ClubChat.tsx`) when Stream is unavailable.
- **Stream server actions — `app/chat/stream-actions.ts`**. The
  `streamSend` / `streamHorn` / `streamWhisperGet` / `streamWhisperSend`
  actions enforce the floor ladder, debited-token check, and 1/hour
  Horn cooldown; the Horn still crosses the existing
  `club_announcements` ticker via the webhook mirror. `ownerStreamBan`
  calls Stream's `client.banUser` and mirrors the ban into the
  Supabase `club_chat_bans` table so the fallback path stays
  consistent.
- **Stream monitor on the Lion Den — `components/ui/Owner/StreamLoungeMonitor.tsx`**.
  Reads straight from the Stream server SDK (not the Supabase
  mirror) so the owner sees the live transport. Per-room latest
  messages, 24h totals, one-click ban (1d / 3d) that hits both
  Stream and Supabase.
- **Shared owner gate — `app/owner/actions-helpers.ts`**. The
  owner-key check that was private to `app/owner/actions.ts` is now
  shared so the Stream actions can gate on it without a circular
  import.
- **Stream webhook signature test — `tests/stream-webhook.unit.test.mjs`**.
  7 pure-logic pins: a fresh signature is accepted; a forged
  signature is rejected; a missing header is rejected; a wrong-length
  signature is rejected (no crash); the body is hashed as raw bytes
  (not re-stringified); gzipped bodies are decompressed before
  hashing; the signature is lowercase hex of length 64. All
  `pnpm test` runs in CI exercise this.

### Changed

- `app/layout.tsx` now mounts `<StreamChatOverlay />` instead of
  `<ClubChat />`; the animation stylesheet
  `styles/lounge-animations.css` is imported globally so future
  surfaces can use the same keyframes.
- `app/owner/page.tsx` mounts the new `<StreamLoungeMonitor />`
  beneath the existing Supabase `<LoungeMonitor />` — the Den now
  shows both the moderation log and the live transport.
- `package.json` (pnpm allowBuilds in workspace yaml) — `stream-chat`
  and `stream-chat-react` are now allowed to run their install hooks
  (no behaviour change in production, just unblocks the pnpm
  postinstall check that pnpm 11 enforces).
- `app/layout.tsx` (pre-existing bug surfaced by the new types):
  `ServiceWorkerRegister` was imported as a named export but the
  file uses a default export. Fixed.

### Fixed

- **TypeScript narrowing on `m.created_at` in the Stream SDK**:
  the SDK's `LocalMessage.created_at` is typed `Date`, but the
  field is a string on the wire; the overlay + whisper now coerce
  to a string before storing, and the build passes.
- **`award_badge` RPC param name**: Supabase's generated types
  expect `p_slug`; the Stream-side horn call now uses the right
  name.

### Validation

- `pnpm lint` — clean
- `pnpm test` — 31 pass / 0 fail (15 prior + 8 stream-webhook pins
  - 8 lounge-drag pins)
- `pnpm build` — green; `/owner` 12.4 kB (was 11.7 kB); the Stream
  overlay ships as part of the shared bundle

### Fixed (post-launch)

- **Chat showed up outside the club** (founder bug report #1): the
  Stream overlay mounted for any signed-in user, including those
  who hadn't completed verification (e.g. a private-window session
  that signed up but never verified). Added a `verified_at` check
  in the client-side feature-flag flow (and a server-side check
  in `streamSend` / `streamSendAsUser`) so the panel never appears
  for unverified users. The Supabase fallback already had this
  check via `loungeVerified()`.
- **Draggable panel flew off-screen on drag** (founder bug report
  #2): the new Stream overlay had no drag handler at all (I
  stripped it during the UI rewrite). Added a pointer-event
  drag handler on the header with an anchor-snap pattern: the
  anchor is updated synchronously on every `onPointerMove` so
  the cumulative drift that pushes the panel out of bounds
  can't happen. The panel position is now `top`/`left` from the
  viewport (not `bottom`/`right`), with `0,0` as the natural
  bottom-right anchor. Persisted to `localStorage`
  (`lounge-stream:pos`). The same bug existed in concept in the
  Supabase overlay (now also using the snap pattern), and the
  math is pinned in `tests/lounge-drag.unit.test.mjs` (8 tests
  that exhaustively sweep the viewport, including the cumulative
  drift case that produced the bug).
- **Send button did nothing** (founder bug report #3): `streamSend`
  was using `client.channel(...).sendMessage(...)` from the **server
  SDK**, which uses the API-secret token and is NOT authorized to
  send on behalf of a user. The call returned an empty payload and
  no message ever landed. Added `streamSendAsUser` in
  `utils/stream/server.ts`: it issues a per-call user token
  (`client.createToken(userId)`), opens a fresh SDK instance with
  that token, watches (or creates) the channel, and sends with
  `user_id: user.id`. `streamSend` now calls `streamSendAsUser` so
  every message is attributed to the right member.
- **Send-button error feedback was silent** (founder bug report
  #3 follow-up): the catch in the client never showed what went
  wrong. `streamSend` now returns a structured `{error}` and the
  composer renders it as a red error banner above the input.
  Users see why the send failed (verify required, floor too high,
  insufficient tokens, etc.).
- **Pill click made the panel disappear** (founder bug report #4):
  the Stream watch effect ran an unhandled-promise-rejection path
  when `ch.watch()` was called on a channel the user wasn't a
  member of, or when a Stream event arrived with a shape the
  hydration didn't anticipate. React then unmounted the whole
  overlay, taking the pill with it. Fixes:
  1. **Guard the effect**: it now runs only when the panel is
     `open` (no wasted network + smaller error surface).
  2. **Mounted-checks** on every state setter inside the effect
     (`safeSetMessages`, `safeSetPresent`, `safeSetHornBurst`,
     `safeSetUnseen`) so a state update after unmount can't fire.
  3. **Try/catch** around every Stream SDK call — `ch.watch()`,
     the `state.messages` hydration, the `ch.on('message.new',
...)` registration, the presence listeners.
  4. **Belt-and-braces** `.catch(...)` on the IIFE itself, so
     anything that escapes the inner try/catch still doesn't
     become an unhandled rejection.
  5. **Error boundary** at the layout level: the overlay is now
     mounted under `ClubChatBoundary`, which catches any remaining
     synchronous render error and renders a recoverable retry
     pill instead of unmounting.
  6. **Pinned** the contract in `tests/lounge-resilience.unit.test.mjs`
     (7 new tests) — a future "cleanup" can't quietly strip the
     safety nets.

> The Supabase chat overlay remains the foundation. The Stream overlay
> is the new live transport; the Supabase chat is the runtime fallback
> and the test/development target. Both share the same floor ladder,
> the same take-private consent, the same Horn cooldown, the same
> privacy toggles, and the same context-menu actions. The Club Chat
> PRD (`docs/PRD-club-chat.md`) is the source of truth; this section
> documents the Stream upgrade on top.

- **Club Chat — the town square** (PRD `docs/PRD-club-chat.md`).
  Always-on chat overlay on every member page: a floating button opens a
  draggable panel with five rooms (Global + Silver / Gold / Platinum /
  Diamond). Your floor and the Global are full; the floors above are
  dimmed read-only — the climb, visible from the cheap seats. Real-time
  via Supabase Realtime (the app's first realtime surface, scoped to this
  module), presence via Realtime, no caps / no rate limits to talk (the
  room _is_ the retention play). Branded with the Cheeky type system
  (Fascinate / Damion / Rancho) and the gold/cyan/club palette tokens.
- **Take-private = a match behind two-sided consent** (anti-workaround):
  the inviter sees a confirmation dialog first; the acceptor's same
  confirmation is the gate. Acceptance runs `club_chat_respond_invite`
  which checks BOTH parties' daily new-people allowance — the consent
  dialog promised it; the RPC enforces it. Creates a real `matches` row
  with `source = 'club_chat'`.
- **Whispers** — ephemeral pair rooms from the context menu. Live via
  Realtime, no caps, courtesy not side-channel (take-private is the
  match-gated path). RLS scopes read to the two participants.
- **The Horn 🎺** — 10 tokens, one blast per hour, lights up in the
  Global room and crosses the club ticker. `club_chat_horn` debits the
  server-side ledger, writes a `club_announcements` row with `kind='horn'`,
  and awards the `chat_horn` badge. The Horn button in the composer
  shows the cooldown countdown.
- **Chat-only collectible family** — `chat_50 / chat_200 / chat_500 /
chat_1000` (Chatterbox tiers), `chat_hour` (The Regular), `chat_horn`
  (Horn Blower). Catalog is book-ready (every badge carries `family` and
  `floor` metadata); no badge is shared between families. Surfaces in
  `/coat-check`. `chat_messages_sent` counter lives on the profile and
  survives the 30-day message purge.
- **Privacy toggles** on `/account` — members can switch off private
  invites and/or gifts so a busy member can't be spammed with either.
  Senders are refused server-side with `invites_disabled` /
  `gifts_disabled` from `club_chat_invite` and `send_gift`. Defaults ON;
  nothing changes until someone opts out.
- **Moderation surfaces**:
  - **Always-on profanity filter** (`public.club_chat_profanity`): the
    message is _squished_ — every non-alphanumeric stripped — before
    matching the word list, so letter-spaced and punctuated workarounds
    don't slip through (the squish fix that closed the live-test hole).
  - **Moderator chat bans** (`public.club_chat_ban`, service-role only):
    escalating 1 day → 3 days, sets `banned_until`. The send RPC checks
    active bans and refuses with `chat_banned`.
  - **In-room context menu** — Go private / Whisper / Mute / Block /
    Report / Give a gift. Report writes the existing `reports` table
    (AI + human queue). Block writes the existing `blocks` table.
    Mute is a client-side hide, persisted in `localStorage`.
- **Lion Den support channel — the Lounge monitor** on `/owner`. A
  service-role live feed across every room, a pending take-private
  inspector, the Horn ticker, and one-click chat bans (1d / 3d) with a
  recorded reason + a pardon action. Service role bypasses RLS so the
  owner sees every message regardless of blocks — moderation demands
  the full picture. Realtime on `club_chat_messages`, `club_chat_invites`,
  and `club_chat_bans`.
- **Member sidebar presence** — the panel's "in the room" strip shows
  everyone online (Realtime presence) and highlights matches /
  conversation partners with a gold border.
- **Safe unit test for the Lounge** — `tests/club-chat.unit.test.mjs`
  pins the profanity squish, the floor ladder, the Horn message format,
  the rate-limit key shape, and the Chatterbox tier thresholds. All
  pure logic, no network, runs in CI. Existing live test
  `tests/club-chat.live.test.mjs` exercises the real RPCs end-to-end
  (ladder, profanity, Horn, whispers, take-private, daily-people cap,
  Chatterbox, bans, blocks).
- **Server actions** in `app/chat/actions.ts` — `loungeSend`,
  `loungeHorn`, `loungeInvite`, `loungeRespondInvite`, `loungeWhisperGet`,
  `loungeWhisperSend`, `loungeHeartbeat`, `loungeTier`, `loungeVerified`,
  `loungePrefs`, `loungeFriendIds`. All thin wrappers over the
  `club_chat_*` RPCs.
- **ClubChatBoundary** — error boundary around the overlay so a stale
  Realtime subscription or a bad profile payload never blanks the page.
  Fallback pill with a retry link.

### Changed

- `app/layout.tsx` now mounts `<ClubChat />` (wrapped in
  `<ClubChatBoundary>`) alongside the existing `<Concierge />` /
  `<TikiTaskbar />` / `<ClubAudio />` so the town square is everywhere.
- `/account` now renders `<LoungePrefs />` (privacy toggles) below the
  existing EmailForm.
- `pg_cron` schedule `cheeky_club_chat_purge` runs nightly at 04:00,
  deleting `club_chat_messages`, `club_chat_whisper_messages`,
  `club_chat_whispers`, and `club_chat_invites` older than 30 days. The
  24h visible window is the client's read window; older logs are
  request-only per PRD §9.

### Fixed

- **ClubChat crashers** (pre-launch block): `TIER_RANK`, `drag`, and `longPress` were all
  referenced but never declared — the component threw on load. `send()` and `horn()` were
  called from JSX but never defined. All four symbols are now wired: the tier map, two drag
  refs (`dragStartRef` for pointer coords, `anchorPosRef` synced from `pos` state via
  `useEffect`), and the two RPCs (`loungeSend`, `loungeHorn`). Drag delta math was also
  wrong — `pos.x + dx` compounded previous drags each stroke — replaced with
  `anchorPosRef.current + (pointer - dragStartRef.start)`, and the anchor is snapped
  forward synchronously after every `setPos` during an active stroke so subsequent moves
  don't double-count. The floating pill button now hides behind `!open` so it never renders
  under the panel; closing the panel restores it. The Horn success toast ("🎺 The club heard
  that.") is back. Lint + build green.
- **Stripe-template migration blew up on re-push**: `20230530034630_init.sql` used bare
  `create table` for `users`, `customers`, `products`, `prices`, and `subscriptions` — any
  existing Supabase project had those tables already, so `supabase db push` failed on the
  first statement. Rewrote with `create table if not exists`, `drop policy if exists`
  before each `create policy`, `create or replace function` for the auth trigger handler,
  and `drop trigger if exists` before recreating the trigger. Also added `drop type if
exists` + recreate for the custom enums (PostgreSQL has no `CREATE TYPE IF NOT EXISTS`).
  Rerunnable without side effects.
- **Club Chat SECURITY DEFINER functions exposed to anon role**: `club_chat_invite`,
  `club_chat_send`, `club_chat_horn`, and 6 other club_chat RPCs were grantable by anyone
  (including unauthenticated users) because Postgres defaults PUBLIC EXECUTE on all
  functions. Added revokes to `20260808075000_revoke_anon_execute.sql` so only
  `authenticated` and `service_role` can call them. The grants to `authenticated` remain
  intact — the app's behavior is unchanged.
- **Duplicate realtime publication**: `supabase_realtime_messages_publication` was sitting
  alongside the standard `supabase_realtime` publication, both containing the club_chat
  message tables. Dropped the custom one via new migration `20260808164000` to prevent
  duplicate broadcast events.

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
- **Landing rhythm**: the all-green body below the hero now alternates green / pink (``)
  per section — How-it-works pink, Dance Floor green, Floors pink, Pricing green with the
  messaging card + token note pink. Headers stay as they were.
- **Accent swap**: the text accent moved green → **cyan** (the founder's call — one hue, no
  straying; cyan on black is ~21:1, the strongest contrast in the kit). The full 50–950 scales
  for gold / cyan / bubblegum_fizz / blue-violet are wired in (`styles/palette-colors.js`,
  mirrored from `styles/tailwind_color_scales.md`).
- **Lighthouse pass**: Stripe's checkout is now lazy-loaded (`next/dynamic` in Pricing + the
  Exchange) — 265 KiB + the two longest main-thread tasks were loading on the landing page for
  every visitor; it now loads only when a price is picked. Responsive image variants
  (`scripts/resize-art.mjs`): navbar/footer logo 206→3 KiB, hero entrance 206→70 KiB, landing
  floor cards ~170→42 KiB each (full-res kept for the room backgrounds).
- **PostHog removed entirely** (founder's call — underused, heavy, and the config headaches
  weren't paying for it): `posthog-js`/`posthog-node` dropped, all capture/identify calls and
  the client init gone, env vars + docs cleaned. Sentry is removed; Stripe + GA can cover
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
  - conversation, chooser plays free, suitors pay at resolution). Host failure (never a
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
- **The Cheeky Lounge is live** — the town square (PRD-club-chat.md, the most important
  module per the founder). An always-available real-time chat overlay floating over every
  member page: **five rooms** (Global + the four floor channels), the visibility ladder
  (type on your floor and below; floors above are dimmed read-only — the climb), and **no
  caps or rate limits to talk** (the room IS the retention play). The app's first realtime
  surface (Supabase Realtime, RLS-authorised) with a presence member list, right-click /
  long-press context menu (go private · whisper · mute · block · report · give gift),
  **take-private = a match behind two-sided consent** counted against the daily allowances,
  the **Horn** (10 tokens, 1/hour — lights up and crosses the club ticker), a chat-only
  collectible badge family (Chatterbox I–IV, The Regular, Horn Blower), an always-on
  profanity filter + escalating chat bans, and 24h visible / 30-day logs / nightly purge.
  Privacy toggles on `/account` switch off private invites and gifts (senders are refused
  with "this user does not accept…"). Schema + UI live-tested **11/11**, lint + build green.
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
  - `tests/ai-probe.live.test.mjs` — AGNES burst probe (8 concurrent: 8/8 ok, ~1s, no 429s).
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
