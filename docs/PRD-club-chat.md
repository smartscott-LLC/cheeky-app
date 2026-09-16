# Club Cheeky — Feature PRD: Club Chat (The Town Square)

> Status: **DRAFT** (2026-08-08) — founder's design, decisions locked in this
> session. The most important module yet: it ties the whole platform together,
> gives members something to do between events, and dissolves the gender
> imbalance by making attention public. Companion: `AGENTS.md`,
> `docs/GAME-ENGINES.md` (this is a **spine-adjacent social layer**, not an
> event-engine game — no clock, no tokens-per-message, no cron).

## 1. TL;DR

**Club Chat is a real-time chat room overlay — the town square.** A floating
button on every screen opens a panel with **five rooms**: a Global room
(everyone, all floors, full) plus Silver / Gold / Platinum / Diamond floor
channels. You type in your floor and below; floors above you are **dimmed,
read-only** — the climb, visible from the cheap seats — and the Global room
is full for everyone. It's a **standard chat room**: no message caps, no
rate limits, no token costs to talk — the room *is* the retention play. The
club's AI (a rotating persona) and a profanity filter moderate it silently.
Club-only frills: **chat-exclusive collectible badges** and the **Horn** —
10 tokens lights up a message and sends it across the club ticker.

## 2. Why — the four pains it kills at once

1. **Dead time between events.** When the daily plays are spent and the
   rooms are between sets, the club goes quiet — and quiet apps die. Club
   Chat is always on: the longer a member stays, the stickier the platform.
2. **The message caps pressure.** The free tier's 30/day + 5 new people are
   generous *on purpose* and must never shrink — but they still run out.
   The chat room is a separate channel with no caps, so "out of messages"
   never means "out of the club."
3. **The gender imbalance.** One-on-one attention is pressure; public
   attention is status. In a room full of witnesses, five people talking to
   you at once is flattering, not threatening — the scarce side stays, the
   eager side gets seen, and the room regulates what private messaging
   can't.
4. **A token sink with a pulse.** The Horn (10 tokens, 1/hour) gives
   token-rich members something fun to spend on and everyone else a reason
   to want a few — excitement and economy in one feature.

## 3. The five rooms

| Room          | Who's in it                     | Who can type                          |
| ------------- | ------------------------------- | ------------------------------------- |
| 🌐 Global     | Everyone, all floors            | **Everyone — full**                   |
| 🥈 Silver     | Everyone (all can *see* it)     | Silver and above (paid floors type down) |
| 🥇 Gold       | Everyone                        | Gold and above                        |
| 💎 Platinum   | Everyone                        | Platinum and above                    |
| 🔷 Diamond    | Everyone                        | Diamond only                          |

- **The ladder:** your floor and below = full. Every floor above = **dimmed,
  read-only** — you can watch the Diamond room buzz, but you can't type.
  The climb is the point (the same pull that sells memberships).
- **Global is the exception:** everyone's full there — the town square
  belongs to the whole club.
- Reading is never blocked (the dimmed view *is* the aspirational UI);
  **typing is server-gated** by your tier vs the room's floor.

## 4. It's a chat room. A regular one.

No new mechanics invented — this is the solved problem chat rooms have been
for thirty years:

- **Real-time.** Messages land instantly (Supabase Realtime — the app's
  first realtime surface, scoped to this module).
- **Room list + member list.** See every room, see **who's in the room
  right now** (presence), with friends (matches/conversations) highlighted.
- **Whispers.** Click a name → whisper: opens a small private room between
  the two of you, ephemeral, chat-internal. Light by design; the room is
  public, whispers are a courtesy.
- **Take private.** Click a name → go private: **a consent dialog first**
  (see §5) — this creates a *match*, not a side-channel.
- **Context menu on every name** (right-click / long-press): Go private ·
  Whisper · Mute · Block · Report · **Give gift**.
- **Give gift from the menu.** Opens the member's inventory → pick a gift →
  send. Same rules as the Gift Shop: **featured gifts announce on the
  ticker**, minis are silent, 1/hour cooldown.
- **Avatars + floor tags** on every message.
- **No rate limits, no caps, no costs to talk.** Spam is a moderation
  problem, not a quota problem (the quota is what killed other apps' chat).
  The Horn is the only token-touch in the room.

## 5. Take-private = a match (the anti-workaround)

Clicking "go private" on a name opens a **confirmation dialog** before the
invite is sent:

> "Inviting them to a private chat **constitutes a match**. If they accept,
> it counts against your new-people-per-day and message allowances. Continue?"

**Consent is two-sided (founder):** the *acceptor* gets the same
confirmation before the match is created — they may not want to give up one
of their people/messages for the day. **Both parties must agree**; only then
is the room created.

Yes → the invite goes. **Accept → a real match** (matches row, conversation
opens, both can talk under the normal messaging rules). Decline/ignore →
nothing, silent. This closes the obvious loophole ("I'm out of messages,
meet me in chat and we'll go private") — going private *is* the messaging
system, with its consent and its caps intact — and it turns the town square
into another **match engine**. The confirmation boxes are the consent
moments, on record.

## 6. The Horn 🎺

- **10 tokens** per blast (not 5 — the founder's call: it should sting a
  little), **max one per hour** (no 100-token whale spamming the ticker).
- The message **lights up** in the room and **scrolls across the club
  ticker** (the existing `club_announcements` surface) with a horn badge.
- The club's only paid chat feature — a fun, capped token sink.

## 7. Moderation — standard, silent, human-backed

- **Profanity/auto-filter — always on, never optional** (founder: optional
  filters get used for the wrong thing). The bog-standard chat element:
  automatic removal, warning on repeat. People will spell around it — that's
  expected; the filter is us doing our part.
- **Chat bans, escalating** (founder): human moderators (on from time to
  time) catch the sneaks — **banned from chat** (never the platform) for
  **1 day, then 3 days, scaling with violations**.
- **The crew AI moderates** — a rotating persona (Chaz or whoever's on
  shift) sits in the room like the six crew chat rooms: silent scan,
  warn / **mute** (timed) / remove. One more persona connection, no new
  AI machinery. Scans are rate-limited so moderation can't blow the
  DeepSeek bill.
- **Report** (any name → report) — queued for **AI + human review** (the
  owner's booth surfaces the queue).
- **Mute** (your own, from the menu) — hides a user's messages for you.
- **Block** — hides instantly, writes the `blocks` table (same as
  everywhere else).

## 8. Chat-exclusive collectible badges

The badge system is one catalog, many collectible families — **no badge is
ever shared between families** (a login-streak badge ≠ a gift badge ≠ a
chat badge). Club Chat adds a new family, **earned only in the room**:

| Badge                 | Trigger                                   |
| --------------------- | ----------------------------------------- |
| Chatterbox (series)   | 50 / 200 / 500 / 1,000 messages in chat   |
| Regular               | 1 hour spent in the room                  |
| Horn Blower           | First Horn blast                          |

Awarded by the existing collectible machinery (catalog + inventory +
`award_badge`-style grant); earned chat badges flash in-room when they
land. Triggers are config values, not rebuilds.

**Collectible book (future — the reason families stay separate):** badges
will eventually live in a collectible book — easy families on the first
page, then lobby / silver / gold / platinum / diamond pages, each drawing
from different parts of the collectible system. Filling a page rewards;
higher floors hold rarer entries (membership pull). The catalog is built
book-ready: every badge carries its family + floor + rarity metadata now.

## 9. Retention & governance (founder-locked)

- **One log per room** — never per-user storage.
- **24 hours visible** in the overlay (rolling).
- **30 days retained** in the DB for moderation and log requests.
- **Nightly purge** past 30 days; a member who needs older logs can
  **request them** (they're tiny text logs; support fulfils).
- Public room = public speech: the room is covered by the existing safety
  governance (report/block, no follow-ups, no dark patterns). Take-private
  carries the match consent dialog (§5).

## 10. Metrics (owner dashboard)

- Members in chat / DAU-in-chat, messages per room per day.
- Retention: time-in-chat vs. churn.
- Match conversion from take-private invites.
- Horn spend (tokens burned/hr) — the sink's health.
- Badge earn rates per trigger.

## 11. Tech notes (sketch — build details follow in the migration)

- Tables: `club_chat_messages` (room_id, sender, floor tag, body, horn
  flag), a fixed room registry by slug (`global|silver|gold|platinum|
  diamond`), `club_chat_whispers` (ephemeral pair rooms),
  `club_chat_mutes` (timed moderator mutes; user mutes are client-side
  hides), Horn → `club_announcements`.
- **RLS:** read = verified members (the dimmed view needs the data);
  **insert is tier-gated** (your rank ≥ room rank, or room = global) — the
  typing gate is server-side. Block-aware selects.
- **Realtime:** Postgres changes broadcast per room + presence for the
  member list. First realtime surface in the app — scoped tight.
- The context menu's gift/block/report reuse the existing
  `send_gift`/`blocks`/`reports` flows; take-private reuses the match +
  conversation machinery behind the consent dialog.

## 12. Out of scope (for now)

- Voice / video rooms, file uploads (images later, maybe).
- Per-user chat history beyond the 24h window (logs are request-only).
- DMs outside the room — the room's "private" *is* the normal messaging
  system, on purpose.

## 13. Locked decisions (this session)

- Five rooms incl. Global; ladder + dimmed read-only above (dim but
  **seeable** — the climb is the point); Global full.
- No caps / no rate limits to talk; the room is the retention play.
- Take-private = match + **two-sided consent** (inviter and acceptor both
  confirm it counts against allowances) + counts against new-people/messages.
- Whisper = ephemeral in-room private. User mute = hide. Block = blocks
  table. Report = AI + human queue. Gift from the menu, same rules.
- Horn = 10 tokens, 1/hour, ticker + lit-up.
- Profanity filter **always on** (never optional); chat bans escalate
  1 day → 3 days by violation count (human-moderator catch).
- Chat-only badge family (Chatterbox 50/200/500/1000, Regular, Horn
  Blower) — catalog is built book-ready for the future collectible book.
- **Privacy toggles (added at build):** members can switch off accepting
  private invites and/or gifts on `/account`. Both default ON; when off,
  senders are refused with "this user does not accept private invites /
  gifts" (`invites_disabled` / `gifts_disabled`, enforced server-side in
  `club_chat_invite` and `send_gift`).
- Retention: 24h visible / 30-day logs / nightly purge / request for older.
