# The Door Check — Verification & Age Policy (Draft)

> **Draft — legal review required before public launch.**

## The framing

Brutus the Bouncer checks everyone's ID at the door. It's nightclub normality —
the only price of admission is being a real person. Quick and painless: no
sweat, you're a VIP.

## Rules

- **18+ hard gate.** Birthday is collected at signup. Anyone under 18 cannot
  sign up. No minors content, no minors profiles, no exceptions.
- **Guests** (unverified) may browse the street level: real profiles, real
  matches, real chat. They see the club through the window (event marquee,
  blurred grid, ticker) — but no events and no tokens until they check in.
- **The check:** government ID + selfie via Stripe Identity.
  - The provider processes the ID/selfie. **We store only the result +
    timestamp + provider reference.** Raw ID and selfie material is never
    stored by us.
  - Success → Silver card + VIP badge + **20 tokens, instantly**.
  - Failure → explainable, retryable. Repeated fraud attempts → bounced.
- **Consent:** a dedicated checkbox for verification/biometric processing —
  separate from ToS, shown before the check runs.
- **One identity per account.** Verification is per-person; trading, lending,
  or faking an identity is a bouncing offense.

## Product flow (Phase 1)

1. Signup asks for birthday. Under 18 → friendly bounce at the door.
2. "Get your card" → Brutus introduces himself, explains the check in one
   sentence, asks for consent.
3. ID + selfie (Stripe Identity, ~60 seconds).
4. Instant result: badge + 20 tokens + "You're in. The Dance Floor opens in
   [X] minutes."

## Enforcement

- Verification state lives server-side (`verified_at`, provider ref) and gates
  event access + token grants at the data layer — never just hidden in UI.
- Fraud attempts and bounced identities are flagged for human review.
