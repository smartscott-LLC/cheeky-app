# Club Cheeky — Feature PRD: Matchmaker

> Status: **DRAFT** (2026-08-07) — founder's design; not yet built.
> A third spark mode, sibling to L³ (docs/PRD-l3.md) under the Spark List hub
> (`/browse`). Extends PRD-foundation.md. Companion: AGENTS.md.

## 1. TL;DR

**Matchmaker is a memory game that earns a first-impression message.**
The user plays a 4×4 board of face-down cards (8 people, 2 copies each);
matching a pair **unlocks one message to that person** — even if that person
has never liked them back. The intro is **earned by play, never bought** —
the generosity engine applied to the most-gated thing in dating.

**"Always a winner."** The 6 random faces are wildcards, so the two unlocked
pairs may not be the two people the user staked — but any match is a win:
an unlocked message to *someone*. The user may send it or keep it; the
recipient may accept or decline **silently**. Wins are messages; losses are
quiet.

## 2. Why

- **Cold-start**: new members get a real chance to start a conversation
  before anyone has liked them — the #1 "why is this empty" problem.
- **Activity**: the game manufactures views of people the user would never
  have seen, plus a reason to keep coming back (plays/day scale by floor —
  §5: 2 free, up to 5 for Diamond).
- **Ownable**: a memory game is a signature, not a swipe clone — "Matchmaker"
  becomes a room people talk about.

## 3. The flow

```mermaid
flowchart TD
    A([Matchmaker]) --> B[Phase 1 - Draft: swipe your floor]
    B --> C{2 draft picks?}
    C -- No --> B
    C -- Yes --> D[Phase 2 - Board: 16 cards face down]
    D --> E[2 stakes x2 + 6 randoms x2 - any floor, compatible pool]
    E --> F[Flip two cards]
    F --> G{Match?}
    G -- No --> H[Strike +1]
    H --> I{3 strikes?}
    I -- Yes --> J[Game over - lose. No unlocks]
    I -- No --> F
    G -- Yes --> K[Unlock one message to that person]
    K --> L[Send the first-impression message]
    L --> M[Recipient alert: someone discovered you in Matchmaker]
    M --> N{Accept?}
    N -- Yes --> O[Chat opens - both can talk]
    N -- No --> P[Silent end - no further contact]
    K --> Q{2 matches?}
    Q -- Yes --> R[Game over - win: 2 messages]
    Q -- No --> F
```

## 4. Floor rules

- **Drafts (the swipe phase): your floor only.** No free-tier peeks at
  paid-floor faces; the paid floors keep their exclusivity.
- **Randoms (the board): any floor, but from the compatible pool.**
  Random *within* the same `isCompatible` filter Spark/L³ use (no
  guy-on-guy boards), floor-weighted: same-floor faces common, upper-floor
  faces rarer — so the top stays special.
- **Cross-floor unlocks are earned + consented.** Matching an upper-floor
  face earns one intro; the recipient accepts or declines silently.
- **Game swipes are draft picks, not real likes.** No accidental matches
  from the swipe phase. If a draft pick has already liked *you* — that's a
  real mutual: it surfaces as a normal match and leaves the board.

## 5. Limits & economy

- **Plays per day scale with the floor (2/3/4/5)** — every paid floor steps
  up, mirroring the messaging ladder (75/15 → unlimited/40 → unlimited/100):

  | Floor | Plays/day |
  |---|---|
  | Silver (free) | 2 |
  | Gold | 3 |
  | Platinum | 4 |
  | Diamond | 5 |

  The dial is server-side (same `current_tier` case pattern as the message
  caps) so a one-line change rebalances the whole ladder. Each play is one
  full board. **5 is the absolute ceiling** — it caps recipient noise and
  keeps upper-floor randoms rare, so a Diamond board still feels special.
  Rewards spenders; never shrinks the free tier.
- **Unlock messages ride their own allowance** — they never eat the free
  tier's 5-new-conversations cap and never shrink it. The game *is* the
  gate; no double-penalty.
- **No tokens, no purchases, no boosts.** The intro is earned by play.
- The daily plays cap is server-side (same `bump_rate_limit` pattern) so it
  holds across devices.

## 6. Guardrails (binding)

- **Silent loss, public win.** A declined unlock ends contact with no
  follow-up, no nudge, no "they'd love to hear from you."
- **No dark patterns.** The board is honest chance + memory skill; no
  fake activity, no pity mechanics, no "almost!" pressure loops.
- **Safety rails reused.** The recipient's alert carries report/block;
  the unlock message flows through the existing messaging safety.
- **The recipient notice mechanic is deferred** (founder): options on the
  table are (a) pure "someone discovered you in Matchmaker" alert, or
  (b) an alert with a like-back window. Decide before build.

## 7. UX sketch

- Phase 1: the spark-lab swipe strip (drafts only — your floor, compatible).
- Phase 2: the board — 16 cards in a 4×4 grid, face down, gold-trimmed
  (the box pattern). Card backs carry the Matchmaker mark.
- Phase 3: flip two; matched pair flips face-up and celebrates; strike
  meter (3 hearts / 3 sparks) at the top.
- Phase 4: unlock card — "You found X — send your first impression"
  (one message, then it's sent); recipient side has the alert + accept/
  decline (silent).
- Mobile: 4×4 grid fits a phone screen; the swipe phase reuses the Spark
  card strip.

## 8. Metrics (owner dashboard)

- Plays/day, match rate per board, strike distribution.
- Unlock send rate (how many unlocked messages actually get sent).
- Recipient accept rate; cross-floor accept rate.
- Cold-start effect: new members who unlock within their first 48h.

## 9. Open questions (founder to decide)

1. **Recipient notice** (deferred): pure alert vs. alert + like-back window.
2. **Randoms pool**: verified-only (recommended, same as L³) — confirm.
3. **Board balance**: 8 pairs / 2-match win before 3 strikes — tune after
   first playtest.

## 10. Out of scope (for now)

- Purchasable extra plays — no (the game is the gate; buying plays would
  make it a paywall).
- Streak pressure ("come back or lose your board") — no.
- Matchmaker-themed variants (speed rounds, team boards) — later, same
  weekly cadence.
