# SESSION MEMORY — Club Cheeky estate · 2026-10-02 (evening)

> Handoff note for the next agent session. Delete or commit at founder's
> discretion. Secrets are NOT here — they live in `.env.new` / `.env.local`
> files and the dashboards.

## THE CLOCK (founder context, stated 2026-10-02)

Founder is **Scott Slater** — inventor (5 USPTO patents, geometric
compression, FPGA architecture, LiNa/DHP safety architecture). UPDATE
2026-10-03: the non-proliferation system ("Dimensions", LiNa adapted) is
**already built and paused on Vercel** — the Nov–Dec USF/DOD/State phase is
travel + teaching a finished system, not development. Club Cheeky is his
occupied-hands project until that travel begins. **Hard implication: the
club must be launch-ready by ~Nov 1.**
"Done" = open, safe, earning, and maintainable without the founder at the
keyboard daily. Every backlog item gets judged against that date. When
context is thin, re-read this section first.

## THE PIPELINE (founder law, stated 2026-10-03 — applies to EVERY module)

implement → **lint** (type-aware + next + react + import plugins, ~160 rules)
→ fix ALL findings, nothing under the rug (ignores/excludes only for the
intentional ones founder will walk through; never add new ones casually) →
**prettier** → **lint again** (prove pretty broke nothing) → **migrate** →
**build** → **run locally** → **push** → validate live (LOCAL validation only
until launch — do not burn Vercel build minutes on rehearsal).
CHANGELOG at every milestone/noteworthy change. ALL docs + CHANGELOG updated
before any context compact or session end.

**Manifest-first order (founder-set):** format → substrate → profile →
membership → assets → model → matches → events (30d) → meta. BioCard is
built section-by-section against it — the card pass IS the personal audit
(founder = the guinea-pig user). Format spec + authority table live in
`docs/PRD-user-manifest.md`.

**THE GUARANTEE: launched by Friday 2026-10-09** (founder guarantee, ~8 days
from 2026-10-03). Every decision weighs against that date.

**PAYMENT/AUTH CONTINGENCY (2026-10-03):** Stripe review still pending at
founder's request; **if not approved by the weekend → pivot.** Clerk is
already configured for ID auth; Square is already set up (business bank
account, ready) for payments. The architecture makes this a seam-swap, not
a rewrite: the app reads entitlements ONLY via `current_tier()` →
`subscriptions` table → webhook sync, so the provider lives at two edges
(checkout call + webhook listener). Founder's standard: everything in the
main app was 0-error/0-warning, fully implemented, live-tested pre-avatar-
detour; that bar applies to every module we touch now.

## The estate (repo map — there were lineage traps, resolved)

| What                 | Where                                                                                                           | Remote                                         | State                                                                                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Club (main app)**  | `/home/server/Downloads/cheeks/cheeky-app` ← WORKSPACE                                                          | `smartscott-LLC/cheeky-app` @ **master**       | `97ebc47` pushed, Vercel ● Ready                                                                                                                                                                                                                         |
| **Lounge (chub)**    | `/home/server/Downloads/cheeks/chub` (canonical)                                                                | `smartscott-LLC/chub` @ **main**               | `47e54ac` pushed, ● Ready. Old copy `/home/server/cheeky/chub` synced-clean                                                                                                                                                                              |
| **Model maker**      | `/home/server/Downloads/cheeks/mini_model_maker` ← **CANONICAL (sibling of cheeky-app, founder's home for it)** | `smartscott-LLC/cheeky_model_maker` @ **main** | `5235306` (auth gate + Violet + useAnimations + HDRI stage), builds green, Violet.glb + punk_girl.glb in public/models (gitignored). `/home/server/C5/mini_model_maker` verified 100% redundant (byte-identical trees incl. .env.local) — safe to delete |
| **Forms**            | `/home/server/smartforms_server` (live docker: form-backend, traefik, metabase). Two nested copies are BACKUPS  | —                                              | untouched                                                                                                                                                                                                                                                |
| **Umbrella toolbox** | `/home/server/Downloads/cheeks`                                                                                 | `smartscott-LLC/full_cheeky` @ main            | `de817ad` — junk files deleted, DB password redacted from docs                                                                                                                                                                                           |
| **HDRI**             | `/home/server/blenderkit_data/hdrs/magenta-cyan-cin_*/`                                                         | BlenderKit, royalty free                       | 2K EXR live: `cheeky-assets/hdri/magenta-cyan-cinematic-studio-2k.exr`; 4K master archived locally                                                                                                                                                       |

**Vercel**: org `smartscott`, projects `cheeky-app` (builds from cheeky-app@master) + `chub`. All Supabase env vars rotated 2026-10-01 and re-synced; 14 stale `POSTGRES_*` secrets DELETED from both projects. App runtime never uses POSTGRES_* (local tooling only). Maker has NO Vercel project yet — founder will attach a subdomain later.

## Done in the last two sessions (all pushed, deployed, verified)

1. **Build unbroken**: lazy-init SDK clients (`utils/email.ts`, `utils/supabase/admin.ts` Proxy, `utils/datesafe.ts`, `lib/stripe.ts` Proxy) so `next build` works without secrets; named errors at runtime.
2. **Quest purge everywhere**: chub cleaned (manifest read path, avatar primitive); club cleaned (app/quest, api/quest, HUD Profile tab); Supabase: buckets `quest-assets` (845 GLBs) + `quest-avatars` + `ui-assets` deleted; tables `avatars`, `asset_catalog`, `quest_catalog`, `ui_catalog` + 3 RPCs dropped (migration `20261001000001`).
3. **Restored collateral damage**: `club_announcements` + `rate_limits` tables (dropped by old full_cheeky cleanup_database.sql while LIVE code used them — horn purchases fail-closed, swipe caps fail-opened) via migration `20261001000002`, incl. widened `bump_rate_limit` key allowlist (`agent|report|matchmaker|l3|horn|swipes`).
4. **Security hardening** (migration `20261001000003`): 22 anon-DEFINER RPCs revoked from anon (members keep via authenticated); `rls_auto_enable` + `on_subscription_activate` locked to service; search_path pinned (`handle_new_user`, `use_icebreaker`); "Read cheeky-assets" listing policy dropped. **`is_test_member()` MUST stay anon-executable** (RLS policy on profiles calls it — a blanket revoke once broke all anon reads). 0029 authenticated-DEFINER warnings = by-design, documented.
5. **Key rotation aftermath**: all Supabase secrets rotated by founder; Vercel envs synced both projects; both redeployed; live bundle verified carrying new key; lounge health all-true. `is_test_member` grant restored.
6. **Manifest substrate** (`7a2c9a2`): `utils/user-manifest.ts` (v0 schema + strict validator + TTL cache + master index `_master.json`), `POST /api/avatar/save` (session-gated single write door), `GET /api/avatar/{userId}` (card-safe, edge-cached). **The previous AI never implemented manifests — this is the first real implementation.**
7. **BioCard** (`components/ui/Cards/BioCard.tsx`): click-to-flip baseball card. Card backs VERIFIED by image: **back1 = winking gold heart = female, back2 = silver velvet rope = male**. Floating badges, avatar slot bottom-right (text pads against), Fascinate/gold section labels, Damion/cyan small labels, Rancho/pink body. First surface: coat check (`/coat-check` shows your own live card).
8. **Maker auth + Violet** (`5235306`): middleware auth gate (chub-style, `NEXT_PUBLIC_COOKIE_DOMAIN` env-gated, unset = current behavior; club-side plumbing shipped too), `@supabase/ssr`, Violet.glb registered (65 joints, 2 clips, 35 segments), `useAnimations` playback, HDRI stage via `CLUB_STAGE_URL` in `app/lib/avatar.ts`, `*.glb` gitignored.
9. **Tooling bugs fixed**: `migrate-hosted.mjs` (failed migrations no longer marked applied), `generate-types.mjs` + 3 `gen-*.mjs` (loaded `env.new` — missing dot), `pnpm-workspace.yaml` placeholder, taskbar test expectations. Repo hygiene: card-back orphans deleted from club repo.

## Doctrine (non-negotiable, founder-stated)

- **SOURCE OF TRUTH = THE LOCAL FOLDER, not git.** The estate lives under
  `/home/server/Downloads/cheeks/` (club + chub + maker as siblings). Never
  read a remote's history to decide which checkout is "current" — a git log
  can only ever be as fresh as someone's last push, and the founder works in
  the folder. All cheeky-app work happens in `Downloads/cheeks/` ONLY.
- **The all-apps test:** the estate root is the folder that contains ALL the
  club's apps together (cheeky-app + chub + mini_model_maker). A directory
  holding one app and a stray script is a workbench/scratch copy, not home.
  (This exact tell was missed twice this week — chub edits started in
  `/home/server/cheeky/chub`, maker edits in `/home/server/cheeky/C5/` — both
  later reconciled into `Downloads/cheeks/`. Everything is verified
  byte-identical or pulled-forward; C5 holds zero unique work.)
- **Post-upgrade ritual (Supabase):** upgrades silently re-grant default
  function privileges. Run `node --experimental-strip-types
scripts/audit-definers.mjs` after every upgrade — it diffs the live
  callable SECURITY DEFINER surface against `config/definer-api.json` and
  fails on drift, missing search_path pins, or non-postgres owners. The
  2026-10-03 upgrade re-granted anon on taskbar_state and the script's
  predecessor check caught it. is_test_member now lives in the `guard`
  schema (policy-only, invisible to the Data API) — the public-schema
  invariant is ZERO accidental anon-definers.

- **Aesthetic**: Fascinate=gold heroes/section labels · Damion=cyan headers/small labels · Rancho=pink body. EVERY surface, every app.
- **No assets in repos** — bucket serves everything (that's how Lighthouse 99/96/100/100 club + 96/100/99/100 chub are held).
- **Manifests, not columns**: all per-user data lives in `user-manifests/{userId}/manifest.json`, indexed by `_master.json` (future: vector DB). Never add a column for user data.
- **Warnings are errors.** lint 0/0, build green, tests pass before any push. No placeholders, no dummy logic. `pnpm test` = 38 pass / 8 live-skipped.
- **One agent per checkout** (two parallel sessions collided this week — resolved, but be careful).
- Deploy order when microfrontends change: **chub first, then cheeky-app**. `microfrontends.json` = extreme care.

## The queue (next up, in order)

1. **`avatar-library` bucket** — create (public, MIME `model/gltf-binary` + octet-stream), move GLBs out of maker repo (punk's 13 MB is committed in git history — repo slim later), maker loads models by URL. Also segment library (22 female models ready, males later).
2. **Segment naming** — founder's python segmentation left `tripo_part_*` names; manifest `segments` map needs readable keys (body/hair/top/bottom/shoes/accessories).
3. **Maker save flow** — save button → `POST /api/avatar/save` (manifest v0 shape in `docs/PRD-avatar-maker.md`); stamp a **snapshot render** into `manifest.card.snapshotUrl` on save → she appears on the BioCard coat-check slot.
4. **Browse integration** — BioCard via the cached read door for other members' info popups.
5. **HUD "Create Model" button** → maker URL (once subdomain exists; `NEXT_PUBLIC_COOKIE_DOMAIN=.smartscott.online` must be set in BOTH Vercel projects first, and maker gets its Vercel project).
6. **PRD open questions** (docs/PRD-avatar-maker.md): bucket name `avatar-library` OK? snapshot-vs-live per surface? save door approved (currently implemented per PRD).
7. Founder TODO: enable **leaked-password protection** toggle (Supabase dashboard → Auth) — one click, last advisor warning.
8. punk_girl re-rig (T-pose) — founder's Blender task.

## Gotchas for whoever picks this up

- **Cloudflare sits IN FRONT of Vercel** for www.smartscott.online
  (`server: cloudflare`, `cf-cache-status` on every response). Consequence:
  after deploys, CF can serve stale HTML referencing dead chunk hashes while
  Vercel itself is fine — symptoms look like "500 on static chunks" +
  "no CSS" + forms degrading to GET submits (no JS hydrated). Remedies, in
  order: hard-refresh → clear site data → **Purge Everything in the Cloudflare
  dashboard** → check cf-cache-status on the HTML (should be DYNAMIC for HTML;
  immutable chunks caching is GOOD). A CF cache rule "do not cache HTML" is
  worth adding at some point.
- The 2026-10-03 sign-in outage was exactly this + a module-eval crash
  (badge-icons calling iconUrl at import time → SSR chunk init order →
  TypeError → 500). Fixed by lazy builders (2889e60). Rule extracted:
  cross-module function calls never run at module scope.

- Maker canonical path: **`/home/server/Downloads/cheeks/mini_model_maker`** (the cheeks family is the workspace: club + chub + maker as siblings). C5 is a retired working copy. The founder's older pre-refactor viewer save sits in the maker's `git stash` if ever needed.
- `supabase/.temp` is tracked in cheeky-app (minor, from old CLI use).
- Maker lint is **biome** (`pnpm lint` = `biome check`); club/chub use **oxlint**. Maker has ~30 pre-existing biome debts in `app/components/ui/*` (founder's to sweep: `pnpm exec biome check --write .`).
- Vercel CLI syntax: `vercel env rm NAME production --yes` (one scope at a time); `printf '%s' 'value' | vercel env add NAME production [--sensitive]`.
- Supabase Storage: bulk delete = `DELETE /storage/v1/object/{bucket}` body `{"prefixes":[...]}`; bucket MIME allowlist edited via `PUT /storage/v1/bucket/{id}`; `storage.objects/buckets` are guarded against direct SQL (policies OK, row deletes not).
- The club's `users` table (avatar_url, billing_address) is stripe-template legacy still referenced by `admin.ts:384` + `queries.ts:39` — separate cleanup someday.
- `test-members` in the profiles bucket = founder's game-testing crew. KEEP.
- Validation loop before push: `pnpm lint && pnpm next build && pnpm test` in the club; `pnpm next build` in maker/chub.

## Live URLs

- Club: https://www.smartscott.online (apex 308s to www) · Lounge: /lounge/:path* on same domain
- Coat check (BioCard demo surface): https://www.smartscott.online/coat-check
- Supabase project ref: `ioqeddpgdilyyajsygmz` · Postgres 17.6 (upgrade confirmed)
