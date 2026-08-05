# Club Cheeky — Executive Audit (v1.0-den-locked)

**Date:** 2026-08-04 · **Commit:** `5bd87de` · **Tag:** `v1.0-den-locked`
**Audit type:** Executive, full-stack, read-only review of the live production state.

---

## Bottom line

Club Cheeky is **production-ready for its current scale** — a well-architected,
security-disciplined codebase with no critical findings. It is a real product
with a real payment rail, real verification, a real content-safety pipeline,
and a governance layer that is *binding on the build* (docs match code). The
honest caveat: at 4 members / 2 verified / 0 paid, **nothing is battle-tested
at volume**. The risks that matter are operational (alerting, human review
loops, email delivery), not architectural.

**The numbers:** ~155 commits · 123 source files · ~15.6k lines (app + components +
utils) · 57 Postgres tables, **0 without RLS**, 66 policies · 0 secrets in the
repo · 11 service-role touchpoints, all server-side.

---

## 1. What shipped (the inventory)

| Area | What exists | Where |
|---|---|---|
| Identity | Signup (gender/preference/18+/consent/honeypot), email confirm → Door Check (Stripe Identity ID+selfie, 18+ gate), verified badge, 20-token bonus | `/verify`, webhook `identity.*` |
| The club | Landing → lobby → 4 floors (Silver/Gold/Platinum/Diamond) with art, crew, elevators; floor closures ("under construction") | `/`, `/club`, `/floor/[slug]`, `/floors` |
| Events | Hourly playlist (Dance Floor, Themed Night, Speed Dating, Rooftop); auto-generated schedule; entries, song phase, no-match auto-refund | `/events/*`, `event_engine` |
| Crew | 6 AI characters with personas; floor-gated chat; streaming DeepSeek; moments; swag delivery in-character | `/crew`, `/chat/[slug]`, `/api/agent` |
| Commerce | Stripe subscriptions (memberships), one-time token packs; **The Exchange** store on every floor; token ledger server-side | `/store`, `/pricing`, webhook `checkout.session.completed` |
| Generosity | Swag codes (SWAG-XXXXXXXX), bundles (tokens+gifts+card in one code), cast budgets, owner mint, flags | `/swag`, `swag_*` tables, `redeem_swag_code` RPC |
| Safety | Report/block in chat, **DateSafe** AI image review (OpenRouter vision, immediate hold on report), human confirm columns | `/api/agent` hooks, `utils/datesafe.ts`, `reports` table |
| Governance | Terms, Privacy, AUP, Refunds, Law Enforcement, Contact, Best Practices, Pricing — all live and footer-linked | `/terms`, `/privacy`, `/aup`, `/refunds`, `/law-enforcement`, `/contact` |
| The Lions Den | Owner cockpit: Mint drawer (presets + bundle builder), announcement board, model failover, floor closures, pulse metrics, events/ledger/catalog boards, flags/grants/rules, engine kill-switch | `/owner` |
| Marquee | Floor announcement banner (ticker / roll / fade) under each floor's name | `AnnouncementBanner`, `announcements` table |
| Ops | Sentry (client/server/edge), PostHog, Vercel auto-deploy on push, milestone tags | — |

## 2. Security posture (verified, not assumed)

- **RLS: 57/57 tables enabled, 66 policies.** The "no client write" tables
  (token_ledger, swag_codes, owner data, model_config) have **zero** insert
  policies — service-role or RPC only.
- **Service role is server-only.** All 11 usages are `'use server'` actions, API
  routes, or `server-only` modules. Client code uses the anon key.
- **No secrets in the repo.** `env.new` and all `.env*` are gitignored; nothing
  tracked contains a live key (verified by grep). Stripe live keys, Supabase
  service key, DeepSeek/OpenRouter keys live in env only.
- **Money is server-side.** `token_ledger` writes go through a SECURITY DEFINER
  RPC; webhook processing is signature-verified **and** idempotent
  (`mark_webhook_processed` — a replay can never double-grant).
- **Verification-as-entry.** No purchases before the Door Check
  (`startCheckoutSession` enforces `verified_at`); Stripe Identity is the
  verification authority; raw ID material is never stored.
- **Content safety.** DateSafe holds reported content the moment a report lands;
  the AI is a first pass only — every ban is human-confirmed; inconclusive
  escalates. Report/block is one tap in every chat.
- **Owner gate.** The Den requires the owner's Supabase account (DB-verified)
  or the ADMIN_KEY; every owner action re-checks server-side.
- **Honeypots + bot shutdown** on signup; daily messaging caps enforced in the
  `send_message` RPC (no client trust, no pay-to-talk).

## 3. Money movement (the full loop)

1. **Memberships** — Stripe subscription checkout (embedded) → webhook
   `customer.subscription.*` → `subscriptions` + entitlements gate floors.
2. **Tokens** — buy a pack at The Exchange → one-time checkout → webhook credits
   `token_ledger` (`reason='token_purchase'`, amount parsed from the synced
   product name, `ref` = session id). Earn: verification bonus, swag codes,
   bundles. Spend: events and gifts **only** — never messaging.
3. **Refunds** — no-match events auto-refund tokens (silent, private); event
   glitches get an owner-minted bundle code (entry back + comfort + gift).
4. **Gifts** — token purchases in the Gift Shop; swag codes can deliver gifts,
   tokens, card days, or bundles.

## 4. Governance compliance

- PRD-first: `docs/PRD-foundation.md` + feature PRDs are the source of truth;
  the floor map, generosity engine, and takedown/appeals docs match the build.
- All member-facing legal pages are **live and footer-linked** — this is the
  set Stripe required, and it exists.
- The takedown/appeals process described to Stripe is **implemented**: immediate
  hold, AI first pass <5 min, human confirmation, appeal path (14-day window,
  evidence, video interview, one-month completion) documented.
- The one known doc/code gap: email notifications (apology/ban/welcome) are
  spec'd but not automated — see gaps below.

## 5. Live metrics (as of audit)

Members **4** · Verified **2** · Paid **0** · Tokens in circulation **100** ·
Gifts out **0** · Codes redeemed **0** · New this week **4** · Messages today
**0** · Events scheduled (next 6h) **29** · Reports **0** · Token purchases **0**

## 6. Known gaps & risks (honest, prioritized)

**P1 — build before real traffic:**
1. **Email delivery is spec-only.** Apology/ban/welcome notices are documented
   but not automated (no email provider wired). Human process covers it today;
   a transactional email provider (e.g., Resend) is the fix. The mailboxes
   (info, helpdesk, date.safely, report-anonymous) exist and are surfaced.
2. **The DateSafe human desk has no UI yet.** Inconclusive reports hold content
   and wait — the columns (`human_verdict`, `human_confirmed_at`) are ready, but
   the owner needs the report queue in the Den to close the loop.
3. **No banned-account registry / re-registration guard.** Expulsion is
   documented (5-year/permanent) but the registry consulted at signup is not
   built.

**P2 — operational hardening:**
4. **Alerting.** Webhook failures and agent failures log to Sentry, but no
   alerts are configured; a dead webhook would silently break token credits.
5. **Rate/abuse limits** on the report endpoint and agent route are not yet
   stress-tested.
6. **Mobile nav crowding** (six items on small screens) — cosmetic, pre-existing.
7. **LogoCloud `<img>` warnings** (3) — the only lint warnings; the trust row is
   intentional, but they could move to `next/image`.

**P3 — hygiene:**
8. **Dependency updates.** Dependabot PRs once broke the build; updates should
   run with a lint+build gate before merge (now the standing rule).
9. **PostHog token on Vercel** — flagged in CONFIG-AUDIT as missing; app runs
   fine without it; confirm when convenient.
10. **Stripe catalog hygiene** — the 1000-token bundle was a monthly-recurring
    landmine (billed forever, granted nothing); now corrected to one-time and
    the webhook credits it. Any future products should be verified at creation.

## 7. Recommendations (the short list)

1. **Email provider + welcome/apology/ban templates** (P1).
2. **The Den's DateSafe review queue** — inconclusive reports, one-tap uphold/dismiss (P1).
3. **Banned-account registry + signup guard** (P1).
4. **Sentry alert rules** on webhook + agent error signatures (P2).
5. Keep the standing rule: **lint + build on the exact tree before every push** —
   the deploy is production.

## Verdict

Solid. The architecture is right, the security discipline is real, and the
governance layer makes the Stripe reviews honest rather than theatrical. The
next 90 days are about **operations, not architecture**: email, the human
review desk, the ban registry, and watching real usage tell us what breaks.
Nothing in this audit is a blocker for launch at current scale.

---

*Audit performed read-only against the live hosted DB and the `v1.0-den-locked`
tree. No changes made during the audit beyond this document.*
