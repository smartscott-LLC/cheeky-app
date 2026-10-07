# SESSION MEMORY — Club Cheeky estate · 2026-10-06 (evening)

## 🏛️ THE PLATFORM DECISION — LOCKED 2026-10-06

**The club's new home is "Ivy"** — the founder's Ivy Bridge desktop (8-core,
16GB, 500GB SSD — the flea-market machine that taught him to code), fresh
Ubuntu Server 24.04 LTS + LUKS, behind **Cloudflare Tunnel** (no inbound
ports, no IP dependency, ISP-proof). k3s single node + Portainer + Traefik +
cert-manager; MinIO for assets/GLBs (Cloudflare edge-caches them); Dragonfly
for dynamic caching (manifests, tiers, rate counters). Supabase KEEPS auth +
RLS + user photos (personal data stays inside the identity fortress —
founder doctrine; Supabase Pro $25 is the insurance premium). Backblaze B2
nightly encrypted backups (non-negotiable). **Failover: the laptop runs the
SAME TUNNEL TOKEN — instant origin swap, zero DNS changes.** Vultr/$300
credit = insurance unspent until earned. Vercel stays warm as the safety net
through the whole migration; cancel only after the last DNS flip.

**LAUNCH MOVED: Friday bet → HALLOWEEN (Oct 31) — a deliberate premiere.**
Nightclub dating app opening Halloween night with avatar COSTUMES in the
Square store. Timeline: wk1 = Ivy + cluster + maker canary; wk2 = lounge +
club + MinIO + Dragonfly + backups + costume pipeline; Oct 24-30 = dress
rehearsal on the new roof; Oct 31 = doors open. Founder's call, fully
supported — "stubborn mule, want it all working."

**TUNNEL PROVEN 2026-10-07 (corrected same day):** public-curl-verified
end-to-end — `maker.smartscott.online` → 307 (Cloudflare edge → `ivy_k8s`
connector → Traefik → pod auth gate) and apex → 302 → www. The `whoami`
pod was MY plumbing canary — the earlier "browser-verified by founder"
attribution was faulty (founder never created or routed it; teardown
queued). Ivy service facts: Traefik (v3.7) on node :80/:443 (svclb),
Portainer :30000 LAN-only, connector runs ON Ivy so its "localhost" IS the
cluster front door. **Tunnel public hostnames must be `http://localhost:80`
— the dashboard can save `https://` and silently 502 the route (TLS
knocking on Traefik's cleartext port). Lesson recorded: check the artifact
(connector log shows the exact pushed config) before theorizing.**

**IVY ESTATE LIVE 2026-10-07 (all internal-Host-verified):**

- `club` ns — `smartscott/club:latest` (Dockerfile, standalone output; 77MB).
  Ingress on www.smartscott.online (dormant until DNS cutover). 200 landing,
  307 gates, webhook door 405-on-GET.
- `lounge` ns — `clubcheeky/lounge:latest`. Serves the SAME URL shape as
  Vercel (`www…/lounge/*`) via Traefik IngressRoute on host www +
  PathPrefix(/lounge) priority 100. **Traefik v3.7 renamed the IngressRoute
  `rule` field to `match`, and its PathPrefix is segment-strict for the bare
  path — include `|| Path(/lounge)` when matching prefixes.**
- `forms` ns — smartforms engine (server.js UNTOUCHED, per founder law) as
  `clubcheeky/smartforms:latest` (pnpm-built) + `pgvector/pgvector:pg16`
  (k3s pulls it itself; don't air-ferry registry images) on PVC `forms-pg`.
  Data restored (form_submissions); `/__health` = discovered_forms
  [cheeky,index]. Ingress host forms.smartscott.online (dormant until founder
  moves that hostname from the old laptop tunnel to ivy_k8s).
- `maker` ns — rebuilt clean; its FIRST deploy had NO runtime env at all
  (307 gate masked it — redirects never touch Supabase). Secret `maker-env`
  now wired via `platform/maker.yaml` envFrom.
- Cookie bridge: `NEXT_PUBLIC_COOKIE_DOMAIN=.smartscott.online` in club
  `.env.new` + chub `.env.local`, BAKED into all images (Next inlines
  NEXT_PUBLIC_* at build time — runtime-only would silently no-op) and in the
  Secrets. E2E login round-trip test at cutover.
- **Env-file doctrine:** `.env.new`/`.env.local` pastes carry literal quotes
  — sanitize at every boundary (`sed -E 's/^KEY="?([^"]*)"$/KEY=\1/'`);
  docker `--env-file`, kubectl `--from-env-file`, and Next build-args all
  pass quotes through as VALUE. Ivy holds `~/club.env` (600, the sanitized
  union) for secret refreshes: `kubectl create secret ... --dry-run -o yaml |
kubectl apply -f -` then rollout restart.
- **Portainer 403 root cause & cure:** the CE first-run admin-creation window is 5 minutes after boot; every expiry = 403 forever until restart. Killed deterministically: `--admin-password-file` (secret from ~/portainer-admin.txt on Ivy, chmod 600) seeds admin at boot, restart-proof. Login verified via API (JWT). UI now plain HTTP `http://192.168.86.23:30000` (--bind :9000 default; note: `--host` = env-to-manage, NOT a listen flag — learned the hard way, --help is ground truth). The Add-environment endpoint API rejects every payload shape (CE quirk) — founder's one wizard click instead; portainer-agent-sa SA + cluster-admin CRB pre-applied for it.
- **Netdata on the OBS wall:** `monitoring` ns DaemonSet, hostNetwork :19999 LAN — `http://192.168.86.23:19999` = RAM/CPU/disk/net/containers, ML anomaly on. k8s gotcha: mounting /dev into the container breaks runc's termination-log — dropped it, netdata degrades gracefully.
- **www CUTOVER HAPPENED 2026-10-07 (founder click):** public www serves the Ivy club NOW (verified: 200 landing, 307 gates, 405 webhook door, zero x-vercel headers). Vercel club+chub pause = whenever founder gets steady; rollback still one hostname delete.
- **Branch reality: the club repo's default is `master`** (GitHub HEAD + what
  Vercel deploys — proven: features pushed to master went live). `origin/main`
  is a zombie at the purged quest build, 64 behind / 0 ahead — recommend
  founder delete it. AGENTS.md "main" is documentation drift, don't chase.
- **Founder law (stated 2026-10-07):** pnpm ONLY (everywhere; the smartforms
  npm-installer was containerized with pnpm and its package-lock deleted —
  engine code untouched), no eslint anywhere (oxlint/biome only — the
  wizard-era `.eslintrc.json` and all `"npm":{}` blocks purged), no stubs
  (dead deps get deleted properly: `chub: link:../chub` removed from club's
  package.json + lock), fix-found-now on all tech debt.
- **Entrance video PULLED** (founder call 2026-10-07 — "the video doesnt
  work anyway, we have enough to worry about"): `EntranceOverlay.tsx` + its
  wiring deleted; bucket asset + `ASSETS.video.entrance` registry entry stay.
  Square button URL `…/club?enter=1` still lands fine (param ignored).
- **Caught mid-move: stray prose rendered in production** — literal sentence
  "I'm just going to position it on the same area." sat in club `app/club/page.tsx`
  JSX (commit 81345e2 era) and shipped to every member's lobby. Removed.
  Manual eyeball of affected flows is not optional.

## Handoff note for the next agent session. Delete or commit at founder's

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

0. **MALE AVATARS — founder reminder 2026-10-06**: the 22 ready models are
   all female; the male set is still the founder's to build in Blender
   (segment → T-pose → Mixamo rig). Do not let him forget. The store, cards,
   and manifest all gender-agnostic already — only the roster awaits.
   0b. **Square "Enter Club Cheeky" button URL** (DONE — entrance PULLED 2026-10-07, param now inert):
   confirmation email): `https://www.smartscott.online/club?enter=1` — that
   param fires the entrance video (once per browser session).
   0c. **Didit workflow is now `e53ce2d4…` ("Fast ID check")** — rebuilt for
   two-state compliance + the 50% ruling (2026-10-06). Env-driven; code
   fallback updated.

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
