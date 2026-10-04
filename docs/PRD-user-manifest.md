# PRD — User Manifest v1 (the document that is the member)

**Status:** DRAFT for founder sign-off · 2026-10-03
**Supersedes:** the avatar-scoped contract v0 in PRD-avatar-maker.md (v0 fields fold in below)
**Doctrine:** all info that pertains to a single user is written, contained,
and read solely in that user's manifest — EXCEPT what physics forbids
(see Authority).

## The TOP — Top Of Pyramid (control plane, founder architecture 2026-10-03)

The master manifest is not a DB artifact — it is the app's **control plane**:
a directory of members and their manifest addresses with a router built in,
etcd-style. The pyramid view:

```
THE TOP          directory + router + uuid validation  (utils/top.ts + _master.json)
 └─ USER MANIFEST one document per member              (user-manifests/{id}/manifest.json)
     └─ SUB-ADDRESSES uniform labeled fields, identical across every member
         └─ DATA    unique to each sub-address
```

- Each layer governs the one beneath it; the TOP is governed _inherently_ by
  the uuid cross-check: token/ledger queries take the regular DB avenue,
  member-data queries take the TOP avenue, both carry the uuid, and a single
  `must be the same` assertion catches misdelivery for free — integrity by
  channel separation (EIDOLON's gated-lane pattern, applied to identity).
- **Sub-addresses are the API.** Uniform schema = uniform address space:
  requests affix sub-addresses (`?fields=profile.photos,membership.tier,
model.snapshotUrl`), responses return exactly those subtrees, and the
  requesting module feeds them straight in. Cards request their sub-addresses
  in one call.
- **Implementation:** `utils/top.ts` exposes `top.get(userId, subaddresses[])`
  and `top.post(userId, subaddress, data)`; `_master.json` is its directory
  behind the interface. If the directory ever gets hot, it graduates to an
  RPC/KV _without any consumer noticing_ — the seam is the design.
- **Two planes:** the TOP is the per-member plane (point address → truth).
  Cross-member queries (browse search, analytics, future vector sweep) are
  the search plane — tables today, vectors later — and they share only the
  uuid. Never make the directory do both.

## Adjacent systems — recorded elsewhere by design (founder-stated)

| System         | Home                                                                                 | Why not the manifest                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token ledger   | Postgres, one avenue only                                                            | "I don't broadcast my financials to the neighborhood" — and the separation IS the cross-validation                                                      |
| Messages       | **GetStream** — real-time, moderated there                                           | the record exists, just not where one expects; Stream lifts a chunk of moderation for us                                                                |
| Matches        | separate module (block/report/ban/illicit-charge checks, pair-keyed treap structure) | needs constant checks; fast, efficient, quiet — the manifest only mirrors the member's _view_ of it                                                     |
| Honeypot finds | separate dossier family with a `source_id` spine                                     | records sources and actors under investigation — a different subject than the member; when the faucet is found, the plumbing to trace it already exists |

## Where it lives

- `user-manifests/{userId}/manifest.json` — private bucket, 1 MB cap
- `user-manifests/_master.json` — master index (path, version, updatedAt,
  hasAvatar, sectionFlags) → the pointer chain the vector-DB phase graduates from
- Doors (only writers): club server code via `utils/user-manifest.ts`.
  The maker talks to `POST /api/avatar/save`. Clients never touch Storage.

## Format v1

```json
{
  "version": 1,
  "userId": "uuid",
  "updatedAt": "ISO-8601",
  "sections": [
    "profile",
    "membership",
    "assets",
    "model",
    "matches",
    "events",
    "meta"
  ],

  "profile": {
    "displayName": "≤80",
    "oneLiner": "≤140",
    "bio": "≤2000",
    "gender": "female|male|...",
    "interestedIn": "…",
    "hobbies": ["≤12 slugs"],
    "photos": [{ "path": "profiles bucket path", "primary": true }],
    "showAge": false,
    "showHeight": false,
    "showLocation": false,
    "age": null,
    "height": null,
    "location": null
  },

  "membership": {
    "tier": "silver|gold|platinum|diamond",
    "verified": true,
    "verifiedAt": "ISO|null",
    "since": "ISO",
    "guestPassUntil": null
  },

  "assets": {
    "badges": [{ "slug": "chat_50", "earnedAt": "ISO" }],
    "displayBadge": "chat_50",
    "gems": [{ "slug": "pearl", "earnedAt": "ISO" }],
    "gifts": [{ "slug": "horn", "count": 2 }],
    "certificates": [{ "kind": "first_date", "issuedAt": "ISO" }]
  },

  "model": {
    "name": "Violet",
    "url": "https://…/avatar-library/….glb",
    "rig": "mixamo",
    "segments": {
      "hair": "…",
      "top": "…",
      "bottom": "…",
      "shoes": "…",
      "accessories": []
    },
    "palette": {
      "skin": "#rrggbb",
      "hair": "#rrggbb",
      "eyes": "#rrggbb",
      "clothing": "#rrggbb"
    },
    "stage": "magenta-cyan-cinematic-studio-2k",
    "snapshotUrl": "https://…/…png"
  },

  "matches": {
    "windowDays": 30,
    "cap": 60,
    "history": [
      {
        "with": "userId",
        "withName": "…",
        "at": "ISO",
        "channel": "swipe|dance|matchmaker|blind|l3"
      }
    ]
  },

  "events": {
    "windowDays": 30,
    "history": [
      {
        "kind": "dance_floor",
        "at": "ISO",
        "result": "matched|no-match|watched",
        "spent": 3
      }
    ]
  },

  "meta": {
    "persona": "sasha",
    "storyComplete": false,
    "streak": 12,
    "lastCheckin": "2026-10-03",
    "createdAt": "ISO"
  }
}
```

## Authority — who is the source of truth for what

| Data                     | Authoritative home       | Manifest role                             | Why                                                                             |
| ------------------------ | ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------- |
| profile, model, settings | **manifest**             | source                                    | pure user document, single-writer                                               |
| badges/gems/gifts/certs  | tables (award RPCs)      | **mirror** (append on award)              | awarding is server logic; manifest is the read view                             |
| membership tier/verified | subscriptions + profiles | **mirror** (refresh on webhook/verify)    | Stripe + verification are the truth                                             |
| matches                  | matches table            | **mirror** (append ≤50, both users' docs) | two-sided integrity can't live in two documents                                 |
| events                   | event_entries + events   | **mirror** (append, 30d window)           | clock-driven engine owns it                                                     |
| tokens                   | **token_ledger ONLY**    | **absent**                                | AGENTS.md: atomic server-side ledger; never in a document, never client-visible |
| messages                 | messages table           | **absent**                                | real-time, two-sided, volume                                                    |

Rule of thumb: the manifest never _governs_ — it _is the member's view_.
Anything that could lie if two writers touch it at once stays out or enters
as an appended mirror written by the server door that already owns the event.

## Write doors (every mirror append is a server action)

| Event                             | Door                                                  | Section touched |
| --------------------------------- | ----------------------------------------------------- | --------------- |
| profile save (account form)       | existing action → `updateSection(userId,'profile')`   | profile         |
| membership webhook / verification | admin.ts handlers → `updateSection(…,'membership')`   | membership      |
| badge/gem/gift award (RPCs)       | award paths → `appendAsset()`                         | assets          |
| avatar save                       | `POST /api/avatar/save`                               | model           |
| match created                     | match-creation actions (both users) → `appendMatch()` | matches         |
| event entry settled               | events engine → `appendEvent()` (30d trim)            | events          |
| checkin / story                   | existing RPCs → `updateMeta()`                        | meta            |

Every door: validate section, bump `updatedAt` + `sectionFlags`, write user
object, update `_master.json`, invalidate TTL cache. One implementation in
`utils/user-manifest.ts` — the sections are data, not new code paths.

## Size math (why 1 MB is generous)

profile ~2 KB · membership 0.3 KB · assets ~5 KB · model ~2 KB ·
matches 50×~120 B ≈ 6 KB · events 30d×~150 B ≈ 5 KB · meta 1 KB →
**≈ 25 KB worst case.** The cap is a moat, not a budget.

## Versioning & migration

- v1 adds `sections` flags + `version: 1`; v0 (avatar-only) docs upgrade on
  next save (validator accepts v0, writer emits v1).
- `sectionFlags` in `_master.json` lets cards/audits skip missing sections
  without fetching the doc — the master stays the cheap directory.

## Scaling path (founder-set, 2026-10-03)

1. **Vector DB at the design edge** — the moment the system nears where this
   format stops scaling, the store flips to a vector DB and growth is curbed
   indefinitely. The uniform labeled sub-address space is already shaped for
   it — documents become embeddings with names, retrieval needs almost no
   machinery because the modeling was done from day one.
2. **Kubernetes + regional Terraform at real growth** — the app is built for
   that avenue NOW: separated modules, per-member data planes, stateless
   doors, and channel-separated validation are already the pieces k8s wants.
   Most apps can never make the jump because their data access is one
   tangled root; ours decomposes by geometry, not surgery.

## Build order (founder-set, each = one pipeline pass)

1. **this format, signed off** ← we are here
2. substrate: v1 types + validator + `updateSection`/append helpers + master flags
3. **profile** section + account-form door → your manifest exists
4. **membership** mirror + verify/subscription doors
5. **assets** mirrors on the award paths
6. **model** (v0 contract, already 90% built) + maker save flow
7. **matches** + **events** appends on the game doors
8. **meta** + the full BioCard pass — which audits all of it
9. launch checklist

## Non-goals

- No client writes, ever. No token data in documents. No resurrecting
  columns-for-user-data (the doctrine _is_ the document).
- Vector search: later phase; the master index keeps that door open.
