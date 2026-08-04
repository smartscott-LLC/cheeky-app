# AUP Enforcement & Abuse Minimization

> **Status:** living document, binding on the build. Backs the Acceptable Use
> Policy (`/aup`, public page) and answers how violations are detected,
> enforced, and minimized. Written to be answerable to platform reviewers —
> the controls below are real, running code, not aspiration.

## The posture

The club's answer to abuse is **the door, not the bouncer's fist**. Most AUP
violations are prevented before they happen — enforcement exists for the
residue. Layered as **prevent → detect → respond → monitor**, with data
minimization running through all of it.

---

## 1. Prevention — violations stopped at the door

| Control | How it works |
|---|---|
| Verification-as-entry | ID + selfie via Stripe Identity before a member can interact. Guests are confined to the street level. Blocks minors (18+ birthday + ID gate), anonymous abusers, and account farms. |
| Identity anchoring | `gender` (gentleman/lady) is required at signup and tied to the verified identity — no anonymous sock-puppeting past the door. |
| Mutual compatibility filter | Members only see and are seen by people in their stated dating preference — abuse surfaces and targeting are structurally reduced. |
| Consent traceability | Terms, privacy, best-practices, and verification consent are recorded by version at signup — nothing is buried in a single catch-all click. |

## 2. Detection — automated tripwires

| Control | How it works |
|---|---|
| Honeypot traps | Hidden fields humans never see (signup `company` field; profile `website` field). Bots fill them; the attempt is logged to `honeypot_catches` and the profile is flagged (`bot_flagged_at`). |
| Bot shutdown triggers | DB triggers take flagged accounts off the floor: **no messages, no likes, no waves, no event entries**. Flagged profiles are excluded from browse and event grids. |
| Server-side rule enforcement | Every write flows through enforcing RPCs (`send_message`, `join_event`, `pick_on_floor`, gift RPCs) that check status, caps, blocks, and flags. RLS protects every table; the client is never trusted; service-role writes only. |
| Rate & volume limits | Daily messaging caps per card (Silver 30/5, Gold 75/15, Platinum unlimited/40, Diamond unlimited/100) are hard server limits with **no paid bypass** — messaging is never sold. Caps bound the blast radius of spam and abuse. |

## 3. Response — human judgment, not word-filters

| Control | How it works |
|---|---|
| Report / Block | One tap from any chat. Reports go to a **human bouncer** for review. We deliberately do **not** auto-ban on word filters. |
| Escalation ladder | Warning → temporary timeout → permanent bounce. Threats and illegal content skip straight to a permanent bounce. Escalations are private — no public callouts. |
| Appeals | A real helpdesk desk reviews every appeal, case-by-case, fairness first. |
| Safety desk | `date.safely@smartscott.online` — a direct line for safety concerns, fielded by humans. |
| No-follow-up rule | A decline closes the chat. No re-messaging, no re-pairing in consecutive rounds — enforced in code. |

## 4. Monitoring & observability

- **Sentry** for runtime errors and **PostHog** for product analytics.
- The **owner back door** gives the operator direct review of flags, grants,
  and account states (human-in-the-loop administration).
- Report and ban state is queryable by the operator for fairness review —
  no secret bans; every enforcement action is reviewable.

## 5. Minimization — how little we hold

| Area | Practice |
|---|---|
| Verification material | We **never store** the ID document, the selfie, or the ID number. Stripe Identity runs the check; we store only `verified_at` + provider reference + result. Raw biometric material is not retained by us. |
| PII separation | Public profile data and private PII live in separate tables (`profiles` vs `profile_private`); PII is owner-only behind RLS. |
| Message retention | Member-chosen window (3–90 days), set at profile creation; the stricter participant's window governs shared conversations; a nightly cron purges expired messages. |
| Token ledger | Retained 7 years as a financial record floor. |
| Account deletion | In-app. Profile PII is wiped/de-identified; a de-identified fraud/ban flag may remain. |
| Data minimization principle | We collect what the product needs and nothing else; every field maps to a governance decision. |

## 6. Notes

- Detection is behavioral and enforcement is human-led by design:
  verification-as-entry, honeypot traps, rate limits, and human review of
  every report keep the floor safe without relying on automated content
  scanning.
- The cast are AI characters, clearly labeled, bound by house rules that
  prohibit impersonating humans or pushing purchases.

## 7. Cross-references

| Doc | Relationship |
|---|---|
| `community-safety.md` | Conduct rules and the report/block/ban process this enforces |
| `terms.md` | The Rules of the Club — bouncing, conduct, liability |
| `privacy.md` | What we hold and why (minimization detail) |
| `verification-age.md` | The Door Check — 18+ gate and verification data handling |
| `data-retention-deletion.md` | Retention windows and account deletion mechanics |
| `best-practices.md` | Best practices + external-activity disclaimer (signup v1) |
| Public page `/aup` | The member-facing Acceptable Use Policy |
