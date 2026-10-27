# Launch Status & Remaining Work

**Updated:** 2026-10-27 · **Target: HALLOWEEN — Monday Oct 31** · All facts
below verified against repo, cluster, and live site unless marked ⚠️.

**Launch scope is PURE: club, cards, floors, events, tokens, chats.** The
avatar maker + RPG layer is sealed for phase two (founder+agent joint
decision 2026-10-26 — see CHANGELOG "AVATAR LANE SEALED"). Nothing deleted;
manifest doors + card slots stay warm.

---

## ✅ VERIFIED / DONE

| Area              | State                                                                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform          | Full estate on **Ivy k3s** (club · lounge · maker [dark] · forms+pgvector · netdata · portainer). Cloudflare tunnel `ivy_k8s`, HTTP→`localhost:80`, Traefik v3.7 routing from `platform/` manifests. Zero Vercel in the serving path; Vercel paused as rollback ghost.                                   |
| Build/deploy flow | Laptop edits → `localhost:3000` verify → `ivy-mirror` → **`ivy-build` compiles on Ivy from Ivy's own ~/src** (source + git + secrets mirrored; laptop ships no binaries). Proven on club, lounge, forms, maker.                                                                                          |
| Money rail        | Square webhook (signature/dedupe/order→grant→ledger→manifest) + `ITEM_LIBRARY.csv` contract, storefront links live (`smartscott.square.site/memberships`, `/token-packages`). Stripe layer FULLY excised (code, deps, env, secrets — verified zero). ⚠️ one real order not yet run (phase 2 fire-drill). |
| The door          | Didit KYC wired (session create + verified webhook grant chain + callback signage). ⚠️ one live verification pending (founder-capped).                                                                                                                                                                   |
| Forms             | Engine byte-identical on Ivy, data migrated, both hostnames public, honey pot on. **Founder-verified E2E 2026-10-27: submit → confirmation + notify emails both arrived.**                                                                                                                               |
| Auth/cookies      | `NEXT_PUBLIC_COOKIE_DOMAIN=.smartscott.online` baked club+maker; Supabase auth config untethered (site URL + allowlist on real domains; no *.vercel.app). Login→maker bridge: founder walkthrough pending.                                                                                               |
| Data protection   | Nightly `pg_dump` 17.11 on Ivy (cron 04:15), 14-day window, restore-list verified (132 data tables). RLS on every table; owner-review fixes (ledger self-read policy, taskbar overload drift dropped).                                                                                                   |
| HUD/lobby         | X closes, icons render (remotePatterns), Info tab (own Bio Card), dailies link to rooms, wallet→Exchange/ledger, live clock+date, tier reads truth (Silver-mask bug root-caused + migrated).                                                                                                             |
| Client doctrine   | Font floors in `@theme` (Rancho≥14/Damion≥16), outline-pink button prescription estate-wide (41 files), phantom color tokens defined, fine-print strip on every floor (Terms/Privacy/Refunds/House Rules/Contact).                                                                                       |
| Docs              | README · AGENTS · ARCHITECTURE · IVY-BUILD-FLOW · PRDs (avatar = phase 2) current as of 2026-10-27.                                                                                                                                                                                                      |

## 🚧 PHASE 2 — LAUNCH-READINESS PROGRAM (in order)

1. **Docs sweep** — this file + README + AGENTS ✓; remaining: final pass of
   `docs/*` (API_SPECIFICATION, ENVIRONMENT, Routing_and_configuration) for
   post-Stripe/post-Vercel truth.
   1b. **Dead-code sweep** ✓ done 2026-10-27 (beacons, stripe scripts, ghost map lines, mongodb dep).
   — retire stale suites (Stripe-catalog assumptions
   in unit.test; suites pointing at dead doors), add flow tests: sign-in
   gate matrix (public curl assertions), Square grant chain fixtures,
   Didit webhook vectors, HUD read-door shape, forms engine health,
   build-flow smoke (image → pod → 200). Founder defines the pass-mark;
   no test ships that asserts nothing.
2. **Full-flag lint, zero-sweep rule** — club: clean today (0/0 with all
   four flags). chub: ~N react warnings under `--type-aware --nextjs-plugin
--react-plugin --import-plugin` (refs-during-render, setState-in-effect)
   — FIX, don't ignore. maker: biome errors (ui-kit debt) — fix via
   `biome check --write` review pass. Any surviving warning must have a
   named reason in this file — founder spot-checks.
3. **Prettier estate-wide** — club + chub + maker after lint zero (forms
   engine files are founder-locked byte-identical: exempt with reason).
4. **Fire drills** — real $4.98 Square order + membership grant; one live
   Didit check; email matrix inbox-vs-spam; :00 Dance Floor tick with the
   test pair; rollback drill (bad image → previous digest); token-engine
   burst on the cluster.
5. **Founder confirmation pass** — desktop-app walk (his eyes) → then the
   "next phase" he'll elaborate on.

## 🧭 PARKED / PHASE TWO ROADMAP (post-launch, funded by proof)

Lane 1: 2D stylized character (fills warm manifest sockets) → Lane 2: 2D
outfit packs on the token economy → Lane 3: 3D maker + RPG floor.
Plus: MinIO asset store, B2/R2 offsite for backups (ISP SNI-block noted),
renewal-reminder cron, games-show-full-cards, lounge friends list,
matches-online (needs presence-source decision).
