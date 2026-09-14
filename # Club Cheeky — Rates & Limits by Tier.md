_**All corrections, additions, and adjustments have been underlined and expressed in bold text.**_

\# Club Cheeky — Rates & Limits by Tier

All daily counters reset at \*\*midnight CST\*\* (America/Chicago).  
Sources: \`utils/taskbar.ts\`, \`utils/rate-limit.ts\`, \`utils/events.ts\`, per-feature RPC enforcement, and migration files.

\---

\#\# Messaging

| Tier     | Messages / day | New people / day |
| -------- | -------------- | ---------------- |
| Silver   | 30             | 5                |
| Gold     | 75             | 15               |
| Platinum | ∞ (unlimited)  | 40               |
| Diamond  | ∞ (unlimited)  | 100              |

Enforced by: \`send\_message\` RPC \+ \`taskbar\_state\` RPC counters.  
Matches are always reachable (unlimited new-people spend on matches).

\---

\#\# Swipes (SPARX)

| Tier     | Swipes / day |
| -------- | ------------ |
| Silver   | 15           |
| Gold     | 30           |
| Platinum | 50           |
| Diamond  | 100          |

Key: \`swipes:{user\_id}:cst\` → error name: \`daily\_swipes\_limit\`  
Enforced in: \`app/browse/actions.ts\` → \`likeUser()\`

\---

\#\# L³ (Leave · Like · Love)

| Tier     | Trios / day |
| -------- | ----------- |
| Silver   | 4           |
| Gold     | 8           |
| Platinum | 12          |
| **       | Diamond     | 20  | **  |

⚠️ \*\*DISCREPANCY:\*\* \`utils/taskbar.ts\` \`TIER\_CAPS.l3\` says 2/3/4/5 but the RPC in \`20260912000000\_l3\_daily\_limits.sql\` enforces 4/8/12/15. Taskbar display is \*\*wrong\*\* — needs fixing.

Key: \`l3:trios:{user\_id}\` → error name: \`daily\_trios\_limit\`  
Enforced in: \`l3\_trio()\` RPC

\---

\#\# Matchmaker

| Tier | Plays / day |
| ---- | ----------- |
| **   | Silver      | 3   | **  |
| **   | Gold        | 5   | **  |
| **   | Platinum    | 8   | **  |
| **   | Diamond     | 12  | **  |

Key: \`matchmaker:plays:{user\_id}\` → error name: \`daily\_plays\_limit\`  
Enforced in: \`matchmaker\_start\_board()\` RPC

\---

\#\# Blind Date

| Tier | Joins / day | Cost per join |
| ---- | ----------- | ------------- |
| **   | Silver      | 0 (locked)    | —         | 1 free | **  |
| **   | Gold        | 2             | 15 tokens | 1 free | **  |
| **   | Platinum    | 2             | 15 tokens | 2 free | **  |
| **   | Diamond     | 2             | 15 tokens | 2 free | **  |

_**\*You can give silver access through the events center w/o giving them access to the floor. It will load them into a game and then direct them back to events center when done.\***_

**\- Female users only can \*\*host\*\* (create\_blind\_date) We must make an exception, only in the case where ‘gender \= gender preference’ i.e. If a male user prefers to date males, then this constitutes an exception. Users that have ‘no preference’ or a ‘both preference’ fall back to default.**  
\- Male users can only join as suitors  
**\- Room fills to min 3 suitors / max 5; 60 seconds warm-up before countdown**

Enforced in: \`join\_blind\_date()\` RPC \+ \`create\_blind\_date()\` RPC

\---

\#\# Icebreakers (new — added 2026-09-13)

| Tier     | Uses / day |
| -------- | ---------- |
| Silver   | 5          |
| Gold     | 10         |
| Platinum | ∞          |
| Diamond  | ∞          |

Table: \`icebreaker\_usage\` with \`(user\_id, day)\` unique constraint.  
RPC: \`use\_icebreaker()\` (security definer, increments usage counter).  
Taskbar tile: \`🧊 Icebreakers\` showing remaining count.  
Tracked in: MessageThread (Date Night) when cycling prompts; NOT tracked in Speed Dating (timed slot-based, not interactive).

\---

\#\# Lounge Horn

| | All tiers |  
**|---|----------|**  
**| Cooldown | 1 per 15 minutes |**  
**| Cost (entire app announcement on ticker & chat rooms \- all) | 10 tokens |**  
**| Cost (in-lounge chat rooms only \- all) | 5 tokens |**  
**| Cost (gift shop should offer both types) | 10/5 tokens |**

Keys: \`horn:user:{user\_id}\` (lounge) \+ \`horn:shop:{user\_id}\` (gift shop)  
Error name: \`horn\_cooldown\`  
Writes to \`club\_announcements\` table on success; awards \`chat\_horn\` badge.

\---

\#\# Gifts

|                    | All tiers                                     |
| ------------------ | --------------------------------------------- |
| **                 | Send cooldown                                 | 1 per 15 minutes                          | **  |
| **                 | Featured gift accepted for premium gifts only | 2-hour floor pass \+ decorated date room  | **  |
| **                 | Premium Basket gift accepted                  | 24 hour floor pass \+ decorated date room | **  |
| Mini gift accepted | just opens chat (silent gesture)              |

No daily cap — hourly cooldown only.  
Ticker fires for featured and basket gifts only (not mini).

\---

\#\# Event Entry Token Costs

**| Event | Cost | Floor required | Rank |**  
**|-------|------|---------------|------|**  
**| Dance Floor | 3 tokens | Silver | 0 |**  
**| Themed Night | 5 tokens | Gold | 1 | 1- free gold | 2 \- free platinum | 3 \- free diamond |**  
**| Speed Dating | 25 tokens | Platinum | 2 | 1 \- free for platinum| 2 \- free for diamond |**  
**| Rooftop | 40 tokens | Diamond | 3 | 1 \- free for diamond |**  
**| Blind Date | 15 tokens | Gold | 1 | free rates established above |**

Schedule: staggered hourly — :00 Dance Floor, \*\***:15 Themed Night \- remove from active list.**, :30 Speed Dating, :45 Rooftop.  
Blind Date: host-created, runs on-demand within 10-min fill window.  
**Refunds issued for no-match on dance floor and rooftop only\*\* . Blind Date and Speed Dating have a risk involved and as such your playing is what you are paying tokens for. No matches on rooftop and dance floor result in not being able to ‘play’, so they are refunded in the event of a no match\*\***  
**Themed Night can be added to the event schedule as under development and as a coming soon attraction in the event center. We will build a new themed night experience after launch that involves a rpg mission with it\!It was retired from the scheduler but the cost/rank remain in the test fixtures.**

\---

\#\# Cheeky Challenge (lounge mini-game)

|                      | All tiers                            |
| -------------------- | ------------------------------------ |
| Games / day          | Unlimited                            |
| Rounds per game      | 3                                    |
| Directives per round | 60                                   |
| Round duration       | 60 seconds                           |
| Points per directive | 3 (\<300ms) / 2 (\<700ms) / 1 (rest) |
| Perfect round score  | 180                                  |
| Bot avg per round    | \~48 (80% of perfect)                |
| Score Board top      | 20                                   |

Score tiers for ranking:  
\- 3 pts: respond within 300ms  
\- 2 pts: respond within 700ms  
\- 1 pt: respond within 1000ms (the directive window)

Bot partners use seeded-random directives; difficulty scales with seed.  
Implemented in: \`chub/app/page.js\` → \`ChallengeOverlay\` component.

\---

\#\# Check-in / Daily Streak

|                           | All tiers                     |
| ------------------------- | ----------------------------- |
| Check-in                  | 1 per day                     |
| First verification reward | 20 tokens                     |
| Streak bonuses            | See \`daily\_checkins\` table |

Check-in tracked via \`public.daily\_checkins(user\_id, day)\`.

\---

\#\# Photo Limits (profile)

| Tier     | Max photos |
| -------- | ---------- |
| Silver   | 3          |
| Gold     | 6          |
| Platinum | 10         |
| Diamond  | 15         |

Enforced in: \`app/account/page.tsx\` photo upload handler.

\---

\#\# Token Store (buy packs)

| Pack     | Tokens | Price |
| -------- | ------ | ----- |
| Starter  | 100    | $4.99 |
| Standard | 1000   | $9.99 |

## Membership Token Grants per membership purchase.

Gold \- 50 Tokens  
Platinum \- 150 Tokens  
Diamond \- 500 Tokens

Tokens DO NOT roll-over for membership granted tokens. The DO rollover for Token Packs purchased from the store.  
\---

\#\# Tier Price Points

1. **Now that we have that list of the rate limits and stuff per membership level and things like that we need to then update the product page right our pricing page and product page we need to update the descriptions with the correct rate limits and everything and what they get per membership purchase right the other thing we're going to do is we're going to add a token grant for each membership that they buy right if they buy a a gold membership it comes with 50 tokens if they buy a platinum membership it comes with 150 tokens and if they buy a diamond membership it comes with 500 so we just want to make sure that that's added to those as well. that may also incur using the stripe CLI or the stripe mCP server or something within their platform Joy needs to be updated in all spots.**

\---

\#\# Discrepancies & Issues Found

\#\#\# 1\. L³ Taskbar Display is Wrong  
\`utils/taskbar.ts\` \`TIER\_CAPS\` says L³ is \`2/3/4/5\` but the RPC enforces \`4/8/12/15\`. The taskbar shows the lower, incorrect numbers. \*\*Needs fix.\*\*

\#\#\# 2\. Message Limits Missing Platinum/Diamond  
\`tests/supabase/migrations/20260801193952\_message\_limits\_tiers.sql\` hardcodes:  
\`\`\`sql  
v\_msg\_limit := case v\_tier  
when 'Gold Membership' then 75  
else 30  
end;  
\`\`\`  
Platinum and Diamond fall through to the \`else\` branch \= 30 messages/day, same as silver. \*\*Needs fix — should be ∞ for plat/diamond.\*\*

\#\#\# 3\. Blind Date Cost Not Visible in Taskbar  
The taskbar has no tile for Blind Date cost or remaining joins visibility beyond the count. The \`blind\_date\_joins\_today\` counter exists in \`taskbar\_state\` but the taskbar shows it as \`left\` (remaining), not as a cost indicator.

\#\#\# 4\. Themed Night Retired but Still in Test Migrations  
\`20260802030000\_floor\_playlist.sql\` inserts themed\_night at :15 with 5 tokens, but \`20260806040000\_retire\_themed\_night.sql\` retires it. The \`KIND\_META\` in \`utils/events.ts\` does not include it, but test fixtures still reference it.

\---

\#\# Files to Update

| File                                                               | Issue                                               |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| \`utils/taskbar.ts\`                                               | L³ caps: change 2/3/4/5 → 4/8/12/15                 |
| \`supabase/migrations/20260801193952\_message\_limits\_tiers.sql\` | Add platinum/diamond branches for msg/people limits |
| \`app/events/\[kind\]/page.tsx\`                                   | Add Blind Date token cost to event metadata         |
| \`docs/rate-limits-by-tier.md\`                                    | This file — keep synced with code                   |

**TASKS: Take care of all of the issues and make all the adjustments needed and add what elements you need to bring all of this up to date\!\!**
