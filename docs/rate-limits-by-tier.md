# Club Cheeky — Rate Limits by Tier

All daily limits reset at **midnight CST** (America/Chicago).  
Sources: `utils/taskbar.ts` (`TIER_CAPS`), `utils/rate-limit.ts` (`RATE_LIMIT_ERRORS`), and per-feature RPC enforcement.

## Messaging (send_message RPC)

| Tier     | Messages / day | New people / day |
| -------- | -------------- | ---------------- |
| Silver   | 30             | 5                |
| Gold     | 75             | 15               |
| Platinum | ∞ (unlimited)  | 40               |
| Diamond  | ∞ (unlimited)  | 100              |

Enforced by: `send_message` RPC + `taskbar_state` RPC counters.

## Swipes (SPARX — likeUser action)

| Tier     | Swipes / day |
| -------- | ------------ |
| Silver   | 15           |
| Gold     | 30           |
| Platinum | 50           |
| Diamond  | 100          |

Enforced by: `bump_rate_limit` RPC with key `swipes:{user_id}:cst`. Error name: `daily_swipes_limit`.

## L³ (L³Trio — selectTrio action)

| Tier     | Trios / day |
| -------- | ----------- |
| Silver   | 2           |
| Gold     | 3           |
| Platinum | 4           |
| Diamond  | 5           |

Enforced by: `bump_rate_limit` RPC with key `l3:{user_id}:cst`. Error names: `daily_trios_limit`, `daily_l3_limit`.

## Matchmaker (MatchmakerBoard — playMatchmaker action)

| Tier     | Plays / day |
| -------- | ----------- |
| Silver   | 2           |
| Gold     | 3           |
| Platinum | 4           |
| Diamond  | 5           |

Enforced by: `bump_rate_limit` RPC with key `matchmaker:{user_id}:cst`. Error name: `daily_plays_limit`.

## Blind Date (join_blind_date action)

| Tier     | Joins / day |
| -------- | ----------- |
| Silver   | 0           |
| Gold     | 2           |
| Platinum | 2           |
| Diamond  | 2           |

Enforced by: `join_blind_date` RPC (tier-gated). Error name: `daily_blind_limit`.

## Lounge Horn (blowHorn — chub app)

| Tier      | Cooldown   |
| --------- | ---------- |
| All tiers | 1 per hour |

Enforced by: `bump_rate_limit` RPC with key `horn:{user_id}`. Error name: `horn_cooldown`.

## Gifts (send_gift RPC)

| Tier      | Send window |
| --------- | ----------- |
| All tiers | 1 per hour  |

Enforced by: `send_gift` RPC cooldown. Not rate-limited by daily cap — hourly cooldown only.

## Tokens

- No daily spend cap. Tokens are spent on events (Dance Floor, Speed Dating, Rooftop, Blind Date) and gifts.
- Events cost tokens per entry; refunds issued when no mutual match (per event type).

## Chat / Lounge

- No daily message limit in the lounge chat (Stream Chat handles moderation separately).
- Horn: 1 per hour per user (see above).
- Block/mute: permanent until owner removes block or timeout expires.

## Notes for Pricing Page

When updating the pricing page descriptions:

- **Silver (Free):** 30 msgs, 5 new people, 15 swipes, 2 trios, 2 matchmaker, 0 blind date joins, 1 horn/hour
- **Gold ($9.99):** 75 msgs, 15 new people, 30 swipes, 3 trios, 3 matchmaker, 2 blind date joins, 1 horn/hour, **+50 tokens**
- **Platinum ($19.99):** ∞ msgs, 40 new people, 50 swipes, 4 trios, 4 matchmaker, 2 blind date joins, 1 horn/hour, **+150 tokens**
- **Diamond ($29.99):** ∞ msgs, 100 new people, 100 swipes, 5 trios, 5 matchmaker, 2 blind date joins, 1 horn/hour, **+500 tokens**

Token grants per tier are new — add to Stripe product metadata so the webhook syncs them on subscription creation.
