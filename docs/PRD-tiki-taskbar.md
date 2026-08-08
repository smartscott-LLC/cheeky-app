# Club Cheeky — Feature PRD: The Tiki Taskbar

> Status: **DRAFT** (2026-08-08) — founder's design; not yet built.
> The universal action bar — the club's to-do list. Shows every member, on
> entry, exactly what's available to *them* right now, keyed to their tier.
> Extends `PRD-foundation.md` (the Ladder, the Event Engine). Companion:
> `AGENTS.md`. Reference flow: `tiki_task_bar.mmd` (founder's sketch).

## 1. TL;DR

**The Tiki Taskbar is a gold-trimmed bar at the top of the feed showing live,
actionable to-dos: unread messages, unanswered sparks, plays left, events
open — each an icon + a count that navigates to the thing and decrements when
the thing is done.** It is the play-in to the whole availability of the club:
the free tier lands and instantly sees "there's a lot to do here", paid tiers
see the bar expand as their floors unlock. Universal, collapsible, and
movable.

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

## 5. The tiles (config-driven, tier-aware)

One config file (`utils/taskbar.ts`) drives the tile set: which tiles exist,
which tier unlocks each, and how each count is computed. Adding a tile or a
new event later = one config entry, no page surgery. Tiles render in order;
locked tiles are **hidden** (the bar literally expands as the tier rises —
see §6).

| # | Icon | Tile | The count (number) | Unlocks | Taps to |
|---|---|---|---|---|---|
| 1 | 📩 | Cheeky Chats | unread messages | all | `/messages` |
| 2 | ⚡ | The Spark List | unanswered sparks (incoming likes/waves you haven't replied to) | all | `/browse` |
| 3 | 🎯 | Matchmaker | plays left today (2/3/4/5 — the locked dial) | all (when Matchmaker ships) | `/browse` matchmaker mode |
| 4 | ❤️ | Blind Date | live room? seats left / "open" | Gold+ | `/events/blind_date` |
| 5 | 🪩 | Dance Floor | minutes to the next set ("now" when live) | all | `/events/dance_floor` |
| 6 | 🔥 | Coat Check | current streak | all | `/coat-check` |
| 7 | 🪙 | Tokens | balance | all | `/store` |

Notes:
- Tiles 1–4 are the founder's four from the sketch (to-dos that decrement).
  5–7 are the availability readouts that make the bar a "what's here" map —
  remove or reorder at will, the config makes it one-line.
- **Blind Date "tries left"**: Blind Date is host-driven (the Gold hostess
  opens a room; suitors buy a seat). There is no per-member "tries" mechanic
  yet — proposal: the count is **live seats left in an open room**, and the
  tile shows a "closed" state (dimmed, no number) when no room is open.
  Founder to confirm or define the mechanic.
- **"Unanswered sparks"** semantics to confirm: incoming likes/waves with no
  reply from me (the browse tab's received-likes queue).

## 6. Tier expansion (the Ladder, visible)

- Silver: Chats, Sparks, Matchmaker, Dance Floor, Coat Check, Tokens.
- Gold adds: **Blind Date**.
- Platinum adds: **Speed Dating** (plays/open state when it's live).
- Diamond adds: **The Rooftop** (live/open state).
- Nothing is ever *removed* — the bar only grows. This is the visual promise
  of the Ladder: every floor visibly adds a tile.

## 7. Update logic (from the founder's flow — binding)

1. A trigger fires (new message, new spark, event unlocked, play used).
2. The bar adds/updates the icon + count.
3. The member taps the icon → navigates to the linked screen.
4. Task completed → count decrements (or the tile clears).
5. The bar refreshes to the remaining to-dos.

Implementation: counts are fetched server-side per render (profile tier +
the count queries) and refetched client-side on a light interval (60s) + on
navigation. Realtime channels (Supabase) are a v2 upgrade if we want
instant counts without polling.

## 8. Data sources

- Tier: `current_tier` RPC (already the single source of truth).
- Unread: `messages`/`conversations` (read state) — needs a read-flag query.
- Unanswered sparks: `likes` + `waves` where the member is the recipient and
  no reply/match exists yet.
- Matchmaker plays: the 2/3/4/5 dial (server-side config, same
  `current_tier` case as the message caps).
- Blind Date: live room state (`events` kind `blind_date` status open).
- Dance Floor: next `events` row of the kind.
- Streak: `daily_checkins` (the Coat Check already tracks it).
- Tokens: `token_ledger` sum (existing `getTokenBalance`).

All server-side queries run behind RLS with the member's session; nothing
client-trusted (the token figure is display-only, the ledger is the truth).

## 9. Guardrails

- **Free tier stays generous.** The bar is a map, not a paywall: locked
  tiles are hidden (not teased with "pay to see"), so the free member sees
  a full, alive club — the expansion is a reward, never a shove.
- **No fake counts.** Every number is a real query result. No "3 people
  viewed you" invented numbers.
- **PWA perf.** The bar is one small component + a few indexed queries; no
  new heavy client deps. Keep the landing page free of it (it's the LCP).

## 10. Open questions (founder to decide)

1. **The tile set** — are the four sketch tiles + Dance Floor/Coat
   Check/Tokens right, or fewer/more?
2. **Blind Date "tries"** — live-seats-left until a tries mechanic exists, or
   define one (e.g., N joins/day)?
3. **"Unanswered sparks"** — confirm it's incoming likes/waves without my
   reply (the received queue).
4. **Adjustability** — top/bottom + hide/collapse per device OK? Or synced
   across devices (server pref, v2)?
5. **Mount points** — all member pages, or the feed-like pages only
   (lobby, floors, event center)?

## 11. Out of scope (v1)

- Realtime push counts (poll first, channels later).
- Server-synced bar preferences.
- Locked-tile teasers ("🔒 Gold" upsell chips) — hidden tiles only, per §9.
- Taskbar on the landing page.
