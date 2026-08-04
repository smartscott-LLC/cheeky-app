# Governance Layer — "Brutus the Bouncer"

> **Legal status (founders' decision, 2026-08-02):** policies are self-drafted
> and binding on the build. They are living documents, refined as the club
> grows and revenue allows. There is **no external legal-review gate** before
> launch: a lawyer's sign-off does not shield the club from liability, and
> the operating shield is the policy language itself (disclaimers, as-is
> liability, external-activity terms) — which is already drafted. Early-stage
> apps commonly iterate policies with counsel only once revenue supports it.
> The voice is the club's. The substance is real.

## What this is

The rules of the club, written down *before* the code, so the code is built to
fit them — not the other way around. Every governance decision that shapes
schema or flow is locked here and enforced in Phase 1+.

## The framing (all nightclub, all the time)

- **Brutus the Bouncer conducts the check.** ID + selfie at the door. He asks
  the questions, launches the verification process, gets the consent
  checkmark. Quick and painless — no sweat, you're a VIP.
- **Everyone gets checked.** It's nightclub normality. Verification isn't a
  penalty; it's what makes the room safe enough to have fun in.
- **We're the guy collecting keys at the party.** All this governance is for
  the members' own protection — nobody wants to be the reason the vibe dies.
- **Trying to sneak past Brutus = bounced.** People who game the system are
  exactly who the club doesn't want in it. That's the point, and it's the brand.

## Document index

| Doc | What it locks |
|---|---|
| `terms.md` | The Rules of the Club — membership, subscriptions, tokens, conduct, bouncing |
| `privacy.md` | What the Bouncer Knows — data collected, why, rights |
| `verification-age.md` | The Door Check — 18+, ID + selfie, biometric handling, consent |
| `community-safety.md` | Keeping the floor safe — conduct, report/block/ban, no-follow-up rule |
| `data-retention-deletion.md` | The Key Return — retention windows, account deletion |
| `refunds-tokens.md` | House rules on the house currency — refunds, no-match, cancellations |
| `best-practices.md` | Best practices + external-activity disclaimer — acknowledged at signup (v1) |
| `aup-enforcement.md` | How AUP violations are detected, enforced, and minimized — the controls behind `/aup`, answerable to reviewers |
| `stripe-prohibited-activities.md` | Stripe submission — protocols for trafficking, illegal acts, impersonation, and CSAM (one document, per-section copy-paste) |
| `takedown-appeals.md` | Takedown notice, review process, and the member appeal path — with the corrected Stripe submission answer |
| `language-notes.md` | **Internal only** — the writing rules for external review + the truthful build record |

## Code-shaping decisions (locked before Phase 1 schema)

| Decision | Policy |
|---|---|
| Age | 18+ hard gate at signup. Birthday collected. No minors, period. |
| Verification data | We never store the ID docs, selfies, or ID numbers. Stripe Identity runs the check (ID number lookup — US SSN currently; selfie method available for international coverage). We store `verified_at` + provider reference + result only. Raw biometric material is not retained by us. |
| Consent | Explicit, separate checkbox for verification/biometric processing — never buried in ToS. |
| Account deletion | In-app. Profile PII wiped/de-identified. A de-identified fraud/ban flag may remain. |
| Cancellation | One-click cancel from Account, always visible, no confirmation-begging. (FTC Click-to-Cancel compliant.) |
| Refunds | No-match events auto-refund tokens, privately. Event canceled for low fill = auto-refund. Token packs follow Stripe's process; monetary disputes are Stripe's, we intervene on escalations. |
| Retention | Chats: member-chosen (3 days–3 months), set at profile creation; stricter participant's window applies to shared conversations (v1). Token ledger: 7 years (financial records floor). Verification result: retained for fraud prevention, de-identified on deletion. |
| Bouncing | Warning → temporary ban → permanent removal. All appeals decided case-by-case, fairness first. Human in the loop, no secret bans. |
| No-follow-up rule | A decline closes the chat. No re-messaging, no re-pairing in consecutive rounds. Enforced in code. |

## How it's enforced

- **In code:** RLS, consent records, verification state, report/block/ban tables,
  refund logic — built to these policies in Phase 1–2.
- **In product voice:** every governance surface is framed as club procedure
  (Brutus checks the ID, the club holds the keys, conduct rules are the vibe).
- **In operations:** moderation escalation path, ban appeals, data-deletion
  requests — defined in `community-safety.md` and `data-retention-deletion.md`.
