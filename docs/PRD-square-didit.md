# PRD — Square + Didit Pivot (payments & verification)

**Status:** DRAFT for founder sign-off · 2026-10-05
**Supersedes:** Stripe Checkout/Subscription flows and Stripe Identity in
`docs/PRD-foundation.md` §billing/verification (Stripe: 3 days, no approval —
"their loss")

## What changed

| Concern               | Was                                                             | Now                                                                                                                          |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Checkout + pricing    | Stripe Checkout (in-app, `app/actions/stripe.ts`, `/pricing`)   | **Square Online store** — `smartscott.square.site` (hosted; club-branded; memberships, token packs, gift sets, 7-day trials) |
| Recurring billing     | Stripe subscriptions                                            | Square subscriptions ($9.98/19.98/29.98 mo) + one-time 7-day trials                                                          |
| Identity verification | Stripe Identity (session + webhook → `applyVerificationResult`) | **Didit** — ID doc + face scan + liveness, flow built by founder, `DIDIT_API_KEY` in env                                     |
| Fulfilment trigger    | Stripe webhooks → subscriptions/products tables                 | **Square webhooks** → entitlement grant (and Didit webhook → verification grant)                                             |

The club app stops _charging_ and starts _listening_: money lives at Square,
identity lives at Didit, the club grants floors and badges when told.

## Billing model (founder decision, 2026-10-05 — POLICY, not limitation)

**The club never bills you.** No recurring subscriptions, ever — memberships
are time-boxed purchases with server-side expiry, and renewal is a
_reminder_, not a charge. The founder's words: "I can't stand when I forget
to cancel… these aren't rich people on an app like this." This is the
anti-dark-pattern doctrine promoted to a headline: **we renew nothing; we
remind you of everything.** Marketing should say it out loud on the landing
page, the store banner, and the pricing cards.

### Mechanics (already built — the grant chain IS the model)

1. Square item purchased (incl. $0 Silver for the record) → webhook
2. Grant chain: `entitlement_grants` row — `tier` + `expires_at`
   (30 days standard; 7 days trials) + `reason='purchase:<item>'`
3. Tokens per tier on purchase (Gold 100 / Platinum 200 / Diamond 500 —
   `membershipTokenGrant` already maps it; one grant per purchase, not per cycle)
4. `current_tier()` resolves it with zero changes (guest → grant → legacy
   subscription); manifest `membership` mirrors; welcome mail
5. **Renewal reminders**: daily cron sweep (rides the existing minute-cron
   infra) — `expires_at` in 7/3/1 days → Resend mail with the store link.
   Silence after expiry is enforced by `current_tier()` itself; nothing to
   cancel because nothing recurs. No cancel button needed — because there is
   nothing to cancel. (The PRD's "never hide the cancel button" becomes the
   stronger: never create the need.)

### Consequences

- `subscriptions` table + Stripe recurring machinery = legacy, kept harmless
  until the Stripe rip-out pass (post-launch)
- Square items must be one-time priced with duration in the NAME
  ("Gold Membership — 30 Days", "7-Day Diamond Trial") — founder renames in
  Square dashboard; grant chain parses these exact strings
- `/pricing` + landing copy: "…/mo" language must die — "30 days of Gold"
  replaces it (our pass, next copy edit)

## The grant chain (the heart of it)

1. Member buys on `smartscott.square.site` (checkout email = their club email)
2. Square fires `order.payment.completed` (webhook → new route
   `/api/webhooks/square` in cheeky-app)
3. Webhook: verify signature → resolve catalog item → find member **by email**
   → write `subscriptions`/`entitlement_grants` (same tables `current_tier()`
   already reads — zero downstream change) → mirror `manifest.membership` →
   best-effort welcome mail
4. Idempotency: reuse the `webhook_events` guard (event-level, same discipline
   as the Stripe route)

**Why the app barely changes:** `current_tier()`, the HUD, floors, taskbar,
manifests all read the DB, not Stripe. The provider was always a plugin at two
edges — that geometry is exactly why the pivot is days, not weeks.

## Verification swap (Didit)

- `/verify` starts a Didit session (API key in env; flow already configured in
  the Didit dashboard) → member does ID + face + liveness
- Didit webhook → same `applyVerificationResult` shape: mark
  `profiles.verified_at`, `profile_private` verification record, +20 token
  grant, badge, welcome mail (all existing code paths)
- `verifiedDob()` (Stripe report → birthday) needs a Didit equivalent or the
  birthday stays self-declared — founder decision

## Open questions (founder)

1. **Email = the join key.** Square buyer email must match their club account
   email, else the grant has nowhere to land. Accept for launch (plus an
   owner-tools manual grant fallback, which exists) or add a "link your
   purchase" flow later?
2. **Which Square events** did the dashboard flow configure — `order.created`
   / `order.payment.completed` / subscription-specific webhooks? Send me the
   skill prompt + the webhook signature secret name and I'll build the route
   against exactly what Square will send.
3. **`/pricing` and in-app checkout**: keep as a catalog page that links out
   to the Square store (recommended for Friday — delete `app/actions/stripe.ts`
   - Stripe client code), or leave Stripe code dormant until the store proves
     out?
4. **Token packs**: the store sells them — grant path = same webhook chain
   (item name → `parseTokenAmount` already reads "…100 Tokens" patterns).
   Confirm token packs on Square carry the same naming.
5. **Supabase webhooks** (the capability you just enabled): what did you wire
   it to? If it's DB-change → edge-function → external, we should make sure it
   doesn't double-fire with the Square route.
6. **Stripe cleanup**: `STRIPE_*` env vars, webhook route, Identity code —
   rip in this pass or after launch? (Doctrine says rip once the replacement
   is live; nothing under the rug.)

## Launch-week scope (Friday)

Must-have: Square webhook route → grant chain → trial items work end-to-end;
Didit verification live on `/verify`; `/pricing` links to the store.
Nice-have: token-pack auto-grant, Stripe removal, subscription lifecycle
webhooks (cancel/pause) — post-launch week.
