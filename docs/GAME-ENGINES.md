# Club Cheeky — Game Engines & the Playability Check

> The architecture doc for how games run. Two engines, one club. When a new
> game or event is proposed, run it through the **Playability Check** (§4) —
> it decides which engine the game belongs on and what it must reuse. This is
> the doc future games get measured against, the way the hourly events are
> measured against `docs/PRD-event-logic.md`.

## 1. The two engines

### The Events Engine — clock-driven rooms

The Event Center's scheduled, timed, multi-member rooms: the hourly wheel
(Dance Floor :00, Themed Night :15, Speed Dating :30, Rooftop :45), plus
Blind Date and Date Night.

- **Owns:** `events`, `event_entries`, `event_picks`, entry holds →
  spend/refund, the minute cron (`finalize_events`) that turns rounds over.
- **The clock is the referee** — rounds resolve on schedule, not on a
  user's tap.
- **Tokens:** events cost tokens per floor (entry hold converts to spend).
- **Reference:** `docs/PRD-event-logic.md`.

### The Spark Game Spine — instant, solo, value-application games

The matchmaking games that resolve the instant the player acts — no clock,
no room, no cron. Every one applies a **value to a choice**:

| Game          | The choice                    | The value applied      | Resolved by         |
| ------------- | ----------------------------- | ---------------------- | ------------------- |
| Swipes (Spark) | One face                     | Like / skip            | `create_like`       |
| L³            | Three faces                   | Leave / Like / Love    | `create_l3_pick`    |
| Matchmaker    | A pair of flips (a round)     | Match / Strike         | `matchmaker_flip`   |

- **Shared machinery (the spine):** `matches`, rewards (`l3_rewards`,
  `gift_inventory`, `matchmaker_unlocks`), the messaging stack
  (`conversations` / `messages` / `send_message`), rate limits
  (`bump_rate_limit` namespaces), `current_tier` / `compatible` /
  `tier_rank`, and the test-member gating.
- **The server is the referee** — every resolution is an atomic
  security-definer RPC, and the client only renders what the RPC reveals.
- **Tokens:** never on messaging or spark games (mission guardrail). The
  generosity engine is the gate — rewards are earned, never bought.

## 2. Matchmaker — the newest spine game (the reference implementation)

- **PRD:** `docs/PRD-matchmaker.md` (BUILT).
- **Tables:** `matchmaker_boards` (the state machine), `matchmaker_drafts`
  (phase-1 picks — never real likes), `matchmaker_cards` (**deny-all RLS** —
  the client only sees what the flip RPC reveals, so the board is honest
  chance), `matchmaker_unlocks` (earned first impressions).
- **RPC flow:** `matchmaker_start_draft` → `matchmaker_pick_draft` (≤2,
  your floor or beneath) → `matchmaker_start_board` (plays dial + 8-pair /
  16-card board build) → `matchmaker_flip` (the round resolver) →
  `matchmaker_send_unlock` (one first impression per matched pair, its own
  allowance — never the 5-new-conversations cap) →
  `matchmaker_respond_unlock` (accept = conversation + match + recipient
  earns the sender-floor gift; decline = silent + sender earns their own
  floor's consolation gift).
- **Economy:** plays/day 2/3/4/5 by floor via the `matchmaker:`
  rate-limit key; Matchmaker-exclusive gifts (one per floor, never
  purchasable — `gift_catalog.matchmaker_only`, `buy_gift` refuses them),
  re-giftable through the normal gift flow.
- **Tests:** `tests/matchmaker.live.test.mjs` (10 green) + the taskbar
  plays-left wiring in `taskbar_state`.

## 3. The round model — Matchmaker's core logic ("boom-boom")

Each round = flip two cards. The **first flip reveals and holds**; the
**second flip resolves**:

```
same person  → round won  → +1 match  → unlock earned for that person
different    → round lost → +1 strike
first to 2 won rounds wins; first to 3 lost rounds loses
```

This is the same "apply a value per choice" shape the other spine games use
per person — one state machine (`matchmaker_flip`), server-authoritative.
A round ends the moment the second card lands — no clock, no cron.

## 4. The Playability Check — which engine does a new game belong on?

1. Does the game run on a schedule, with multiple members sharing a room?
   → **The Events Engine** (`docs/PRD-event-logic.md`).
2. Does it resolve instantly when the player acts, solo, applying a value
   to a choice? → **The Spark Game Spine**.
3. **Reuse, don't rebuild:** the spine's machinery — matches, rewards,
   gifts, messages, rate limits — is the club's. A new spine game adds its
   own value-resolution RPC(s) and tables only.
4. **Tokens:** events cost tokens; spark games never do (the generosity
   engine is the gate, per the mission guardrails).
5. **Every new game ships its live suite** (see `tests/README.md`).

## 5. Known evolution

The spine's match-creation is still per-game (swipes / L³ / Matchmaker each
write `matches` rows themselves). The next spine game should pull the
shared "two signals resolved → match row + reward grant" into one helper so
a third game slots in as configuration, not new engine code.
