# Club Cheeky — Rates & Limits by Tier

All daily counters reset at **midnight CST** (America/Chicago).
Sources: `utils/taskbar.ts`, `utils/rate-limit.ts`, `utils/events.ts`, per-feature RPC enforcement, and migration files.

---

## Messaging

| Tier     | Messages / day | New people / day |
| -------- | -------------- | ---------------- |
| Silver   | 30             | 5                |
| Gold     | 75             | 15               |
| Platinum | ∞ (unlimited)  | 40               |
| Diamond  | ∞ (unlimited)  | 100              |

Enforced by: `send_message` RPC + `taskbar_state` RPC counters.
Matches are always reachable (unlimited new-people spend on matches).

---

## Swipes (SPARX)

| Tier     | Swipes / day |
| -------- | ------------ |
| Silver   | 15           |
| Gold     | 30           |
| Platinum | 50           |
| Diamond  | 100          |

Key: `swipes:{user_id}:cst` → error name: `daily_swipes_limit`
Enforced in: `app/browse/actions.ts` → `likeUser()`

---

## L³ (Leave · Like · Love)

| Tier     | Trios / day |
| -------- | ----------- |
| Silver   | 4           |
| Gold     | 8           |
| Platinum | 12          |
| Diamond  | 15          |

⚠️ **DISCREPANCY:** `utils/taskbar.ts` `TIER_CAPS.l3` says 2/3/4/5 but the RPC in `20260912000000_l3_daily_limits.sql` enforces 4/8/12/15. Taskbar display is **wrong** — needs fixing.

Key: `l3:trios:{user_id}` → error name: `daily_trios_limit`
Enforced in: `l3_trio()` RPC

---

## Matchmaker

| Tier     | Plays / day |
| -------- | ----------- |
| Silver   | 2           |
| Gold     | 3           |
| Platinum | 4           |
| Diamond  | 5           |

Key: `matchmaker:plays:{user_id}` → error name: `daily_plays_limit`
Enforced in: `matchmaker_start_board()` RPC

---

## Blind Date

| Tier     | Joins / day | Cost per join |
| -------- | ----------- | ------------- |
| Silver   | 0 (locked)  | —             |
| Gold     | 2           | 15 tokens     |
| Platinum | 2           | 15 tokens     |
| Diamond  | 2           | 15 tokens     |

- Female users only can **host** (create_blind_date)
- Male users can only join as suitors
- Room fills to min 3 suitors / max 5; 10-minute warm-up before countdown

Enforced in: `join_blind_date()` RPC + `create_blind_date()` RPC

---

## Icebreakers (new — added 2026-09-13)

| Tier     | Uses / day |
| -------- | ---------- |
| Silver   | 5          |
| Gold     | 10         |
| Platinum | ∞          |
| Diamond  | ∞          |

Table: `icebreaker_usage` with `(user_id, day)` unique constraint.
RPC: `use_icebreaker()` (security definer, increments usage counter).
Taskbar tile: `🧊 Icebreakers` showing remaining count.
Tracked in: MessageThread (Date Night) when cycling prompts; NOT tracked in Speed Dating (timed slot-based, not interactive).

---

## Lounge Horn

|                                   | All tiers    |
| --------------------------------- | ------------ |
| Cooldown                          | 1 per 15 min |
| Cost (in-lounge chat — full horn) | 10 tokens    |
| Cost (gift shop chat-only)        | 5 tokens     |
| Cost (gift shop full horn)        | 10 tokens    |

Keys: `horn:user:{user_id}` (lounge) + `horn:shop:{user_id}` (gift shop, chat-only 5t) + `horn:shop:full:{user_id}` (gift shop full 10t)
Error name: `horn_cooldown`
Writes to `club_announcements` table on success; awards `chat_horn` badge.

---

## Gifts

|                        | All tiers                               |
| ---------------------- | --------------------------------------- |
| Send cooldown          | 1 per 15 min                            |
| Featured gift accepted | 2-hour floor pass + decorated date room |
| Basket gift accepted   | tier pass + decorated date room         |
| Mini gift accepted     | just opens chat (silent gesture)        |

No daily cap — 15-minute cooldown only.
Ticker fires for featured and basket gifts only (not mini).

---

## Event Entry Token Costs

| Event        | Cost      | Floor required | Rank |
| ------------ | --------- | -------------- | ---- |
| Dance Floor  | 3 tokens  | Silver         | 0    |
| Themed Night | 5 tokens  | Gold           | 1    |
| Speed Dating | 25 tokens | Platinum       | 2    |
| Rooftop      | 40 tokens | Diamond        | 3    |
| Blind Date   | 15 tokens | Gold           | 1    |

Schedule: staggered hourly — :00 Dance Floor, :15 Themed Night, :30 Speed Dating, :45 Rooftop.
Blind Date: host-created, runs on-demand within 10-min fill window.
Refunds issued for no-match events (Dance Floor, Speed Dating, Rooftop).
Themed Night was retired from the scheduler but the cost/rank remain in the test fixtures.

---

## Cheeky Challenge (lounge mini-game)

|                      | All tiers                          |
| -------------------- | ---------------------------------- |
| Games / day          | Unlimited                          |
| Rounds per game      | 3                                  |
| Directives per round | 60                                 |
| Round duration       | 60 seconds                         |
| Points per directive | 3 (<300ms) / 2 (<700ms) / 1 (rest) |
| Perfect round score  | 180                                |
| Bot avg per round    | ~48 (80% of perfect)               |
| Score Board top      | 20                                 |

Score tiers for ranking:

- 3 pts: respond within 300ms
- 2 pts: respond within 700ms
- 1 pt: respond within 1000ms (the directive window)

Bot partners use seeded-random directives; difficulty scales with seed.
Implemented in: `chub/app/page.js` → `ChallengeOverlay` component.

---

## Check-in / Daily Streak

|                           | All tiers                  |
| ------------------------- | -------------------------- |
| Check-in                  | 1 per day                  |
| First verification reward | 20 tokens                  |
| Streak bonuses            | See `daily_checkins` table |

Check-in tracked via `public.daily_checkins(user_id, day)`.

---

## Photo Limits (profile)

| Tier     | Max photos |
| -------- | ---------- |
| Silver   | 3          |
| Gold     | 6          |
| Platinum | 10         |
| Diamond  | 15         |

Enforced in: `app/account/page.tsx` photo upload handler.

---

## Token Store (buy packs)

| Pack     | Tokens | Price |
| -------- | ------ | ----- |
| Starter  | 100    | $4.99 |
| Standard | 1000   | $9.99 |

---

## Tier Price Points

| Tier          | Monthly | Key differentiator                                                             |
| ------------- | ------- | ------------------------------------------------------------------------------ |
| Silver (Free) | $0      | Verified entry; 30 msgs, 5 people, 15 swipes, 4 L³, 2 matchmaker, 0 blind date |
| Gold          | $9.99   | 75 msgs, 15 people, 30 swipes, 8 L³, 3 matchmaker, 2 blind date joins          |
| Platinum      | $19.99  | ∞ msgs, 40 people, 50 swipes, 12 L³, 4 matchmaker, 2 blind date joins          |
| Diamond       | $29.99  | ∞ msgs, 100 people, 100 swipes, 15 L³, 5 matchmaker, 2 blind date joins        |

---

## Discrepancies & Issues Found

### 1. L³ Taskbar Display is Wrong

`utils/taskbar.ts` `TIER_CAPS` says L³ is `2/3/4/5` but the RPC enforces `4/8/12/15`. The taskbar shows the lower, incorrect numbers. **Needs fix.**

### 2. Message Limits Missing Platinum/Diamond

`tests/supabase/migrations/20260801193952_message_limits_tiers.sql` hardcodes:

```sql
v_msg_limit := case v_tier
  when 'Gold Membership' then 75
  else 30
end;
```

Platinum and Diamond fall through to the `else` branch = 30 messages/day, same as silver. **Needs fix — should be ∞ for plat/diamond.**

### 3. Blind Date Cost Not Visible in Taskbar

The taskbar has no tile for Blind Date cost or remaining joins visibility beyond the count. The `blind_date_joins_today` counter exists in `taskbar_state` but the taskbar shows it as `left` (remaining), not as a cost indicator.

### 4. Themed Night Retired but Still in Test Migrations

`20260802030000_floor_playlist.sql` inserts themed_night at :15 with 5 tokens, but `20260806040000_retire_themed_night.sql` retires it. The `KIND_META` in `utils/events.ts` does not include it, but test fixtures still reference it.

---

## Files to Update

| File                                                          | Issue                                               |
| ------------------------------------------------------------- | --------------------------------------------------- |
| `utils/taskbar.ts`                                            | L³ caps: change 2/3/4/5 → 4/8/12/15                 |
| `supabase/migrations/20260801193952_message_limits_tiers.sql` | Add platinum/diamond branches for msg/people limits |
| `app/events/[kind]/page.tsx`                                  | Add Blind Date token cost to event metadata         |
| `docs/rate-limits-by-tier.md`                                 | This file — keep synced with code                   |
