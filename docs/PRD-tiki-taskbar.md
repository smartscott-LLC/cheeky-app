# Club Cheeky — Feature PRD: The Tiki Taskbar

> Status: **DRAFT** (2026-08-08) — founder's design; not yet built.
> The universal action bar — the club's to-do list. Shows every member, on
> entry, exactly what's available to *them* right now, keyed to their tier.
> Extends `PRD-foundation.md` (the Ladder, the Event Engine). Companion:
> `AGENTS.md`. Reference flow: `tiki_task_bar.mmd` (founder's sketch).

## 1. TL;DR

**The Tiki Taskbar is a gold-trimmed bar at the top of the feed showing the
member's hard-capped daily allowances: messages left, new people left,
Matchmaker plays left, and the coat check — each an icon + a count that
navigates to the thing and decrements when the thing is done.** Token-spend
items never appear: the bar shows what the membership caps give you, never
your token wallet. It is the play-in to the whole availability of the club:
the free tier lands and instantly sees a generous club (30 chats, 5 new
people, 2 plays), and every paid step visibly raises the numbers (∞ chats at
Platinum). Universal, collapsible, and movable.

## 2. Why

- **Discovery without touring.** Members (especially free) don't know what's
  available or won't hunt for it. The bar answers "what can I do right now?"
  in one glance.
- **The free tier sees the value immediately.** Before they've clicked a
  single room, a Silver member sees Chats, Sparks, the Dance Floor, the Coat
  Check, their token wallet — a full club, free.
- **The bar grows with the card.** As tiers progress, tiles unlock — the
  Ladder made visible, which is the best upsell the app has: it shows, not
  tells.
- **Retention.** Live counts (unread, sparks, plays) are a "come back, there's
  something waiting" signal — the same physics as a notification badge, but
  positive and club-shaped.

## 3. The look (founder's spec — binding)

- **The bar**: a horizontal bar with **rounded sides**, **gold outline**,
  sitting at the **top of the feed**.
- **Icons**: each tile's emoji in its natural color (snowflake, fire, heart —
  whatever the tile is), un-recolored.
- **Numbers**: **teal (cyan), Damion font** — the curved script makes the
  counts pop against the gold bar.
- **Heading above the bar**: **"Tiki Taskbar"** in **gold, Fascinate**.
- **Caption under the bar** (optional, pink, Rancho): *"Your daily to-dos."*
- All via existing tokens (`text-gold`, `text-cyan`, `font-hero`,
  `font-header`, `font-body`) — never hardcoded hex.

## 4. Placement, universality, adjustability

- **Universal**: mounted app-wide for verified members (not the landing
  page, not signin/verify/owner). Sticky at the top of the feed, below the
  navbar.
- **Adjustable**: a per-device preference (localStorage) — collapse/expand,
  hide, and move between **top** and **bottom** of the feed. Device-level is
  enough (UI preference, not identity); a server-side profile pref is a v2
  option if the founder wants it synced across devices.
- **Guest/street**: no bar (no events, no tokens — nothing to show).

## 5. The tiles (config-driven, hard-cap only — binding rule)

**The bar carries every hard-capped allowance.** A tile exists if and only
if the membership puts a hard per-member limit on it (daily, or a shorter
window like the gift hour). **Token-spend items with NO rate limit never
appear** — we don't regulate the wallet. **Hourly events (Dance Floor,
Speed Dating, Rooftop) never appear** — they're self-limiting. Token-cost
items that ARE also rate-limited (Gifts, Blind Date) qualify on the rate
limit, never on the tokens. Nothing rolls over; caps reset daily (or on
their window).

One config file (`utils/taskbar.ts`) drives the tile set + the caps (they
mirror `send_message`'s tier logic, the Matchmaker plays dial, and the
`join_blind_date` daily cap — if a cap moves there, it moves here too).

| # | Icon | Tile | The count | Unlocks | Taps to |
|---|---|---|---|---|---|
| 1 | 📩 | Cheeky Chats | messages left today — 30 / 75 / ∞ / ∞ | all | `/messages` |
| 2 | ⚡ | Swipes | new people left today — 5 / 15 / 40 / 100 (the sparks hub's allowance) | all | `/browse` |
| 3 | 💞 | L³ | same new-people allowance (L³ shares the cap, no separate limit) | all | `/browse` |
| 4 | 🎯 | Matchmaker | plays left today — 2 / 3 / 4 / 5 | all | `/browse` |
| 5 | ❤️ | Blind Date | joins left today — 2 / day (enforced in `join_blind_date`) | Gold+ | `/events/blind_date` |
| 6 | 🎁 | Gifts | 1 when a send is ready; minutes-to-ready while cooling (1/hour) | all | `/gifts` |
| 7 | 🔥 | Coat Check | 1 = not checked in today, 0 = done | all | `/coat-check` |

Notes:
- **∞** renders for unlimited messages (Platinum/Diamond) — Damion falls
  back to a system glyph for the symbol itself.
- Pending (founder to decide): **daily like caps** and **super likes** —
  neither exists in the engine yet; when they land, Swipes shows likes
  left and a super-like tile appears (see §10).
- Street (unverified): no bar — one tile instead, **🪪 Get your card**
  → `/verify`. The door is the only to-do before the club opens.

## 6. The Ladder, visible in the numbers

- The tile set grows with the card (Blind Date joins at Gold) and the
  numbers rise with it: Chats 30 → 75 → ∞ → ∞, Sparks 5 → 15 → 40 → 100,
  Matchmaker 2 → 3 → 4 → 5.
- The counts are the promise of the Ladder made visible: the free tier
  sees a generous club (30 chats, 5 people, 2 plays, gifts, the coat
  check) and every paid step visibly raises the numbers.

## 7. Update logic (from the founder's flow — binding)

1. A trigger fires (a message sent, a spark used, a play spent, the coat
   checked).
2. The bar updates the count.
3. The member taps the icon → navigates to the linked screen.
4. Task completed → count decrements (the coat check clears to 0).
5. The bar refreshes to the remaining to-dos.

Implementation: `taskbar_state` RPC returns usage counts in one round trip;
the API route does the "left" math against the caps. The client refetches on
mount, on navigation, on focus, and every 60s. Realtime channels (Supabase)
are a v2 upgrade if we want instant counts without polling.

## 8. Data sources

- Tier: `current_tier` RPC (note: it calls the free floor `standard` — the
  bar maps that to rank 0 / silver caps; the floor slug is `silver`).
- Usage counts: `taskbar_state` RPC — messages sent today (for the chats
  tile), new non-matched people messaged today (the same count
  `send_message`'s people-limit uses), today's check-in flag, and (later)
  Matchmaker plays used.
- Caps: `utils/taskbar.ts` `TIER_CAPS` — mirrors `send_message` (30/5,
  75/15, ∞/40, ∞/100) and PRD-matchmaker §5 (2/3/4/5).
- **Unread (supporting)**: `messages.read_at` + `mark_conversation_read`
  (set when a thread opens); the chat list shows a gold unread pill per
  conversation. The bar itself shows the daily allowance, not unread — the
  read flag powers the chat list.
- Coat Check: `daily_checkins` (today's row = done).

## 9. Guardrails

- **Free tier stays generous.** The bar shows 30 chats / 5 new people / 2
  plays / the coat check — a full club, free. Paid steps visibly raise the
  numbers; nothing is ever shrunk.
- **We never regulate token spend.** No token-cost item appears in the bar.
  A member's bar only reflects their hard caps, never their wallet.
- **No fake counts.** Every number is a real query result (usage from the
  RPC, caps from the config that mirrors enforcement).
- **PWA perf.** One small component + one RPC round trip; no new heavy
  client deps. The landing page never mounts the bar (it's the LCP).

## 10. Decisions (resolved 2026-08-08)

1. **Tile set**: the seven hard-capped to-dos (Chats, Swipes, L³,
   Matchmaker, Blind Date, Gifts, Coat Check). Hourly events and pure
   token items excluded — token-cost items qualify only when rate-limited.
2. **Blind Date / Gifts**: in — rate-limited (2 joins/day enforced in
   `join_blind_date`; 1 gift send/hour), never counted by tokens.
3. **Matchmaker**: tile live with the 2/3/4/5 dial; the game itself is the
   next build.
4. **Adjustability**: per-device — collapse, move top/bottom, hide
   (localStorage). Default dock: bottom-left, 1/3 width.
5. **Mount**: root-layout overlay, all member pages (hidden on /, /signin,
   /verify, /owner, /auth). Street zone gets the 🪪 Get-your-card tile.
6. **Open (founder to decide)**: daily like caps + super likes — neither
   exists; Swipes currently shows the new-people allowance, and the
   super-like feature needs a definition (waves? L³ Love? a new build).

## 11. Out of scope (v1)

- Realtime push counts (poll first, channels later).
- Server-synced bar preferences (device-level only).
- Taskbar on the landing page.
- Like caps / super likes until the founder picks the numbers + shape.
