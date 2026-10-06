# PRD — The Front Door (onboarding flow: consent → verify → membership → club)

**Status:** founder-spec'd 2026-10-05 · build starts immediately
**Implements:** the flow that keeps promises honest — nobody sees "welcome to
the club" until the club is actually open to them.

## The flow (founder's words, codified)

```
ENTER / SIGN UP
  → 1. CONSENT — Brutus's disclaimer page (terms, privacy, AUP, best
       practices; consents table records the agreement)
  → 2. VERIFY — Didit session: ID doc + face scan + liveness
       (vendor_data = club user_id — the webhook returns the join key)
  → 3. MEMBERSHIP — Square store, membership page
       (even the $0 Silver passes through — every member has a record)
  → 4. ENTER THE CLUB — button on the Square confirmation email + store
       site → lands in the lobby ONLY if all gates pass
```

Between steps, the server has time to build the member's manifest — the
webhooks (Didit Approved, Square order paid) do their work while the human
is already walking to the next room. No spinner, no false pretenses.

## The gate (one function, one truth)

`onboardingStep(user)` → `'consent' | 'verify' | 'membership' | 'club'`
computed from, in order:
1. `consents` row exists → else 'consent'
2. `profiles.verified_at` set → else 'verify'
3. membership record (`subscriptions`/`entitlement_grants` row, any tier
   incl. free) → else 'membership'
4. → 'club'

Every guarded entry (lobby `/club`, browse, events, lounge) routes
unready members to their current step — the funnel IS the state machine,
no separate "onboarding wizard" to drift out of sync. Manifest
`sectionFlags` mirror progress for free (the master index doubles as the
funnel dashboard).

## Who does what

| Piece | Where | Status |
|---|---|---|
| Consent page w/ Brutus | new `/enter` (reuses existing policy pages' copy + `consents` table) | build |
| Didit session start | `app/verify/actions.ts` — swap Stripe Identity → Didit API (`DIDIT_API_KEY` ✓ in env) | build |
| Didit webhook | `POST /api/webhooks/didit` — HMAC-SHA256 (X-Signature-V2 canonical JSON; raw-bytes fallback; Simple → re-fetch decision), 300s freshness, constant-time compare, idempotent on `event_id` via `webhook_events` guard | build |
| Approved → grants | reuse `applyVerificationResult` shape: `verified_at`, +20 tokens (stays on VERIFICATION, not the $0 order — no double-grant), badge, welcome mail, manifest membership mirror | wire |
| Declined/In Review | existing `handleVerificationFailure` escalation (3 tries → human) | wire |
| Membership purchase | Square-hosted; webhook grant chain per PRD-square-didit | pending Square keys |
| "Enter the club" link | founder adds to Square confirmation email + store → `https://www.smartscott.online/` (gate routes them correctly even mid-flow) | founder, store console |

## Cloudflare note (critical)

Webhook receivers behind Cloudflare must allow **18.203.201.92** (Didit's
delivery IP) — WAF exception for `/api/webhooks/*` or Didit deliveries die
at the edge with a challenge page. (Same lane as the Square webhook when it
arrives.)

## Needs from founder to build without guessing

1. ~~`DIDIT_WEBHOOK_SECRET`~~ ✓ in `.env.new` + Vercel
2. Didit flow's **success redirect URL** — set it to
   `https://smartscott.square.site/collections/memberships` (verify → store,
   no app round-trip needed) or tell me the intended landing. **Still needed:**
   confirm the Didit console's per-flow success URL points at the store (the
   in-app callback is `/verify?checked=1`; the post-verify jump to the store
   is the flow's own redirect).
3. ~~Square item names~~ ✓ ITEM_LIBRARY.csv is the contract (11 SKUs wired)
4. **CF WAF exception** for the webhook paths — see below (Didit egress IP
   `18.203.201.92` + Square's delivery, or a blanket skip on `/api/webhooks/*`)

## STATUS 2026-10-05: Didit wired end-to-end (`a572178`)
Gate function ✓ · `/verify` → Didit session create ✓ · `/api/webhooks/didit`
signature+idempotency+grant chain ✓ · secrets in Vercel ✓ · workflow-id
landmine caught (real id `75dba526`, not the prompt's placeholder).
Remaining: CF webhook WAF exception (founder), then ONE live verification to
confirm the loop (founder triggers — per-verification cost, not a test-spam).

## Launch-Friday fit

This flow IS the launch experience — consent, door check, card at the
register, lobby. Everything else (trials, gifts, tokens) already works
behind it. Build order: gate function → /enter consent → Didit swap →
Didit webhook → (Square webhook when keys land). Each one through the
full gauntlet.
