# Club Cheeky — Architecture

> The estate map: what runs where, how a request gets in, where truth lives,
> and how a change gets from a laptop to the world. Written 2026-10-11
> (owner-review); keep it current with every structural change (founder law).

## 1. What Club Cheeky is (one line)

A nightclub-shaped dating app: Ladder tiers (Guest→Silver→Gold→Platinum→Diamond→Gems),
an hourly Event Engine, and a server-side token economy — launched on our own
hardware, no recurring platform metering. Product truth: `docs/PRD-foundation.md`.

## 2. Estate topology — three places, each self-sufficient

```
VISITOR ⇄ Cloudflare edge (TLS, orange-cloud DNS)
              ⇄ Tunnel ivy_k8s (connector runs ON Ivy; ALL hostnames → http://localhost:80)
                    ⇄ Traefik v3.7 (k3s ingress; routing source of truth = platform/ manifests)
                          ⇄ pods (see §4)

SOURCES OF TRUTH
  laptop  /home/server/Downloads/cheeks/{cheeky-app, chub, mini_model_maker}
          + /home/server/smartforms_server            ← master working copies (+ .env.new secrets)
  GitHub  smartscott-LLC/{cheeky-app, chub, mini_model_maker}  ← remote archive (deploy branch = master!)
  Ivy     ~/src/*                                     ← full mirrors w/ git + secrets (scripts/ivy-mirror)
  Supabase cloud (project ioqeddpgdilyyajsygmz)       ← auth, Postgres+RLS, member data, photos, assets bucket
```

Every app image is built ON IVY from Ivy's own copy: edit on laptop → verify at
`localhost:3000` (`pnpm dev`) → `scripts/ivy-mirror <app>` → `scripts/ivy-build club|lounge|maker|forms`.
The laptop ships SOURCE only — never binaries. (Owner-review item #1.)

External services: Square (store + memberships + webhook), Didit (KYC), Resend
(mail), Stream (chat SDK), Backblaze B2 (backup — queued). Vercel: paused, kept
warm only as a rollback ghost; all traffic is Ivy.

## 3. Routing table (public)

| Hostname | Entry | Path |
|---|---|---|
| `www.smartscott.online` | tunnel → Traefik | `/lounge*` → lounge pod (IngressRoute, priority 100) · everything else → club pod |
| `smartscott.online` (apex) | tunnel → Traefik | redirectRegex → `www` **preserving path+query** (OAuth callbacks ride it) |
| `maker.smartscott.online` | tunnel → Traefik | maker pod; unauthenticated → 307 to club sign-in |
| `forms.smartscott.online`, `formdata.smartscott.online` | tunnel → Traefik | forms-app pod (server.js engine) |

Traefik quirks learned in the field (don't relearn them): v3.7 IngressRoute uses
`match:` (not `rule:`); k8s pathType `Prefix` is segment-strict — pair
`PathPrefix(/lounge)` with `Path(/lounge)`; router priority via IngressRoute wins
over Ingress length-competition. Tunnel hostnames speak **plain `http://localhost:80`** —
`https://` there = 502 (TLS knock on a cleartext port).

## 4. The workloads (namespaces)

```
club        smartscott/club:latest        Next 16 (App Router) — the club itself
lounge      clubcheeky/lounge:latest      Next 15 JS app — live chat floor, basePath /lounge
maker       clubcheeky/maker:latest       Next 16 — the avatar maker (canary app)
forms       clubcheeky/smartforms:latest  Express server.js — THE ENGINE, runs as-is
            pgvector/pgvector:pg16        + PVC forms-pg (2Gi) — vector-capable DB
monitoring  netdata (DaemonSet, hostNet)  LAN :19999 — the OBS wall
portainer   portainer-ce + agent          LAN :30000, admin from --admin-password-file
kube-system  Traefik/CoreDNS/metrics/local-path — k3s-managed (helm-install jobs), hands off
```

Every app: multi-stage Dockerfile (pnpm only), `output: 'standalone'`,
non-root runner, k8s Secret built on-box from an env file (`~/club.env`,
chmod 600 — never in git). `NEXT_PUBLIC_*` are baked at build time (runtime-only
env for them is a silent no-op — the trap twice hit). Forms engine law:
`server.js` moves byte-identical; only the plumbing (pnpm, no own traefik, no
metabase) changed.

## 5. Data & truth layers

- **Postgres (Supabase)** — all member truth. Row Level Security on every table;
  the app's user clients can only see what policies allow; `supabaseAdmin`
  (service role) is server-only. Money math lives in `token_ledger` + DEFINER
  RPCs (`spend_tokens`, `bump_rate_limit`, `taskbar_state`); the HUD read is
  RPC-backed and the route must 500 on RPC error — never fake a fallback
  (the `?? 'silver'` mask hid an overload bug for weeks; migration
  20261011000001 dropped the untracked `taskbar_state(p_user)` drift).
- **THE TOP (user manifest)** — `utils/top-schema.ts` (geometry) + `utils/top.ts`
  (router). One JSON per member in the private `user-manifests` bucket, written
  through server-side DOORS only (profile edits, verification, purchases,
  avatar saves), mirrored from tables (tables stay the query engine; manifest is
  the portable view + future vector substrate). READ door:
  `GET /api/avatar/{userId}?fields=…` — sub-address allowlist, show-flag gates
  enforced at the apex, live-tier overlay (`current_tier()` is the vote, the
  mirror is the view). Ledger/entitlements NEVER live in the manifest.
- **Photos** — Supabase Storage `profiles` bucket (RLS, owner-bound). `cheeky-assets`
  bucket serves all shared art via `utils/assets.ts` + `asset-manifest.json`.
- **Sessions/cookies** — Supabase SSR. `NEXT_PUBLIC_COOKIE_DOMAIN=.smartscott.online`
  is set on club+maker (baked + in secrets) so one sign-in spans the estate;
  lounge shares the `www` host, so it reads the same jar by path-scoped cookies
  (its own domain cookie would only matter if it ever gets its own subdomain).

## 6. Money & doors (all time-boxed, no recurring billing)

- **Square webhook** → `POST /api/webhooks/square` → signature verify (URL+ts,
  HMAC, constant-time, freshness) → `webhook_events` dedupe → order fetch →
  buyer match by email → grants per `ITEM_LIBRARY.csv` contract (memberships =
  30d entitlement + tokens; trials 7d pro-rated; bundles; gift sets) →
  `store_purchases` ledger (UNIQUE(order_id,sku)) → manifest mirror. Stripe-era
  code paths are dead: the /pricing and /store CTAs still need to be rewired to
  the Square storefront URLs (founder to supply).
- **Didit (KYC)** → session create server-side → `/verify?checked=1` signage →
  authoritative `POST /api/webhooks/didit` (canonicalised HMAC-SHA256-V2,
  idempotent event_id) → approved: badge + 20-token bonus + birthday lift from
  the signed payload + `profile_private` provider + manifest mirror. Declined:
  3-strikes human escalation, silent to peers. One live verification per run
  (they charge per check).
- **Tokens** — integer microcurrency, atomic server RPCs, refunds for no-match
  events, never client-computed.

## 7. Two game engines, one spine (from `docs/GAME-ENGINES.md`)

Clock-driven rooms (Dance Floor :00, Speed :30, Rooftop :45, Blind Date on
demand) run the **Events Engine** (`events`/`event_entries` + minute cron).
Instant solo games (Swipes, L³, Matchmaker) run the **Spark Game Spine**
(matches/rewards/gifts/messages + per-game value RPCs). New games go through
the Playability Check first; architecture forks ask the founder.

## 8. Client conventions (enforced)

- **Palette**: `styles/globals.css @theme` is the ONLY place hexes live
  (gold/cyan/club + pink family + gold ramp + diamond). Components use
  `text-gold`/`text-club`… never literals.
- **Type doctrine**: Fascinate = heroes/gold, Damion = headers/cyan,
  Rancho = body/pink. Floors enforced in @theme: text-xs=14px (Rancho min),
  text-sm=16px (Damion min), text-base=18px. Groupings: Fascinate +4pt over
  its nearest sibling and always the head; heroes excepted. Arbitrary
  sub-floor sizes are banned (50 were swept 2026-10-11).
- **Buttons (founder prescription, estate-wide)**: club-pink buttons are
  OUTLINE — `border-2 border-club bg-black text-club`, hover fills
  `bg-club hover:text-black`. Solid pink + white text is dead.
- Server components by default; `'use client'` only where interactivity demands.
  `components/ui/` presentational; business logic in `utils/`.
- One identity system: uuid PKs everywhere, stable slugs as secondary identity.

## 9. Ops runbook

- `scripts/ivy '<cmd>'` · `scripts/ivy-mirror [app]` · `scripts/ivy-build <app>`
- Verify from inside: `scripts/ivy 'curl -s -o /dev/null -w "%{http_code}" -H "Host: X" http://localhost/Y'`
- Verify from outside: plain `curl https://…` — expect `server: cloudflare` and NO
  `x-vercel-id`.
- Postgres upgrades re-grant EXECUTE silently → run
  `node --experimental-strip-types scripts/audit-definers.mjs`; invariant: only
  `guard.is_test_member` stays anon-executable.
- Secrets: `.env.new` (laptop) / `~/club.env` + `~/forms.env` (Ivy, 600) /
  k8s Secrets created via `kubectl create secret --from-env-file` then
  `rollout restart`. Values never appear in chat, git, or logs.
- Backups (queued): nightly Supabase `pg_dump` → B2; MinIO mirror of
  `cheeky-assets`; renewal-reminder cron for time-boxed memberships.

## 10. Deliberately NOT here (so nobody hunts for it)

No helm charts (k3s ships its own internals via helm-install jobs; our stack is
plain manifests in `platform/ivy/`), no cert management (Cloudflare owns TLS),
no Stripe (Square + Didit replaced it), no Vercel runtime (paused projects kept
only as rollback ghosts; deploy branch history remains `master`), no
self-hosted Supabase (phase 2 — the estate works around it, not on it).
