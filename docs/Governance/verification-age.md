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
- **The check (current):** ID number verification via Stripe Identity — the
  member keys in name, date of birth, and government ID number; the provider
  validates against government and third-party databases.
  - Currently available for **US social security numbers**; broader coverage
    as the provider expands.
  - The provider runs the lookup. **We store only the result + timestamp +
    provider reference.** The ID number itself is never stored by us.
  - The DOB match doubles as the **18+ enforcement** at the door.
  - Success → Silver card + VIP badge + **20 tokens, instantly**.
  - Failure → explainable, retryable. Repeated fraud attempts → bounced.
- **The selfie check** (document + selfie via Stripe Identity, lower per-check
  cost) is available as an alternative method for broader international
  coverage — flip it on when we expand beyond the US.
- **Consent:** a dedicated checkbox for verification processing —
  separate from ToS, shown before the check runs.
- **One identity per account.** Verification is per-person; trading, lending,
  or faking an identity is a bouncing offense.

## Product flow (Phase 1)

1. Signup asks for birthday. Under 18 → friendly bounce at the door.
2. "Get your card" → Brutus introduces himself, explains the check in one
   sentence, asks for consent.
3. Brutus runs the check: name + date of birth + government ID number
   (Stripe Identity ID number verification, ~60 seconds).
4. Instant result: badge + 20 tokens + "You're in. The Dance Floor opens in
   [X] minutes."

## Enforcement

- Verification state lives server-side (`verified_at`, provider ref) and gates
  event access + token grants at the data layer — never just hidden in UI.
- Fraud attempts and bounced identities are flagged for human review.
