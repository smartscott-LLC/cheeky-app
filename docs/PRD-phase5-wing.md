# Club Cheeky — Phase 5 Feature PRD: The Store Wing

> Status: **DRAFT** — locked decisions captured from founder brainstorm (2026-08-02).
> Open items are marked **OPEN** and need founder sign-off before build.
> Source of truth relationships: this doc extends `PRD-foundation.md` (Pillar 2 event
> engine, Pillar 3 token economy). Companion: `AGENTS.md` (how we work).

## 1. TL;DR

Once a member is matched, the app's job changes: **the match is the beginning,
not the end.** Three modules make the club worth staying in after the match:

1. **The Gift Store** — tokens buy gifts (per-floor + a universal basket); the
   send fires an anonymous overhead announcement; acceptance grants a **2-hour
   pass** to the gift's floor plus a decorated date room.
2. **Couple Trivia ("Date Night")** — matched pairs only, free, 15-second
   huddle, mutual-tap answers, couples compete on a leaderboard.
3. **The Characters** — NPC personas (Brutus, the DJ, the bartender…) with
   relationship levels, triggered dialogue moments, and collectible character
   cards. Founder supplies personas + graphics; the engine is asset-driven.

Shared principle: **the club's calendar IS the product** — every activity is a
pluggable mechanic (grid / rotation / round-based / economy), stale events get
swapped, never patched.

## 2. Why (retention thesis)

- Incumbents abandon users at the match ("leave you to your own demise").
- Club Cheeky unlocks **matched-only content** — stuff couples can do that
  unmatched users cannot, which makes matching the *entry point*, not the finish.
- The **game side** (characters, badges, atmosphere) keeps non-daters and
  dry-spell users coming back: the club is a place to *be*, not a feed to check.
- Word of mouth: "I was on Club Cheeky for three hours" — time-in-app is the
  marketing engine.

## 3. Module 1 — The Gift Store

### 3.1 Catalog (LOCKED)

| Floor | Special gift | Tokens |
|---|---|---|
| Silver | 🧸 Stuffed animal (teddy bear) | 25 |
| Gold | 🌹 Golden bouquet of roses | 50 |
| Platinum | 💎 Jewelry (necklace / tennis bracelet) | 100 |
| Diamond | 🍾 Bottle of champagne | 200 |
| **Every floor** | 🧺 The Gift Basket (all four) | **300** (vs 375 bought separately — saves 75) |

### 3.2 Rules (LOCKED)

- **Buy down, never up.** You may buy gifts from your floor and below. A
  Diamond may send a teddy bear; a Silver may never buy the champagne.
- **Tokens debit at purchase** — the gift lives in the sender's **personal
  inventory** (server-side ledger + inventory table).
- **Send limit: one gift offer per hour** (global, not per gift). Prevents
  ticker flooding / rejection spam loops.
- **Denied gift → returns to inventory** with a 1-hour cooldown; re-aim at
  someone else. No refund (tokens already spent at purchase), no item loss.
- **Accepted gift → consumed** (the bottle's popped).
- **Announcement: anonymous to the club** — "a bottle of champagne just
  popped!" No sender, no recipient, no outcome. The gamble: anonymity lowers
  acceptance rate, and that's accepted.
- **Recipient sees everything privately** — the incoming gift notification in
  their message area shows the sender's profile + **photo** (first thing
  anyone wants to know), with accept / deny.
- **Accept → 2-hour pass to the gift's floor** (reuses the `guest_passes`
  entitlement chain — `current_tier()` honors it automatically) **plus a
  decorated date room** (certificate-room skin machinery, gift-themed).
- **Basket's pass = the sender's floor** (OPEN — my lean; prevents a Silver
  handing out Diamond passes).
- **Blocks respected** — cannot gift someone who blocked you.

### 3.3 Flow

```mermaid
flowchart TD
    A[Gift store — buy with tokens] --> B{Enough tokens?}
    B -- no --> A
    B -- yes --> C[Debit at purchase · gift to inventory]
    C --> D[Send — 1/hour limit]
    D --> E[📢 Anonymous overhead announcement]
    E --> F{Recipient accepts?}
    F -- deny --> G[Silent · gift returns to inventory · 1h cooldown]
    F -- accept --> H[2-hour pass to the gift's floor + decorated date room]
    H --> I[Pair explores together for 2 hours]
```

## 4. Module 2 — Couple Trivia ("Date Night")

### 4.1 Rules (LOCKED except where noted)

- **Matched pairs only.** No solo play. Unmatched users see the door, not the game.
- **Free to play.** No token entry — matched couples already paid to get here
  (verification / events / gifts). Tokens stay in the gift store.
- **Round structure:** a multiple-choice question drops to both partners
  simultaneously; **15-second huddle** in their existing chat to agree; the
  couple's answer locks only when **both tap the same option** (the Dance
  Floor mutual-pick mechanic, used for agreement).
- **Couples compete against couples** — per-round leaderboard.
- **Rewards: badges + streaks + collectibles only** (Date Night badge,
  7-night streak, character-card tie-ins). No token rewards — pride is free,
  tokens are the economy.
- **Entry: on-demand first** (a "Date Night" button inside a matched chat);
  scheduled club-wide couple tournaments later — same engine (see §6).
- Trivia content: curated question bank; swap-able like any mechanic.

## 5. Module 3 — The Characters

### 5.1 Vision (LOCKED direction, mechanics OPEN)

The club is populated by players **and** characters — MMORPG atmosphere.
Characters have relationship levels, greet you at milestones, and become
collectible relationships over time. The game side keeps non-daters coming back.

### 5.2 Cast (founder-driven)

| Character | Role | Where they live |
|---|---|---|
| **Brutus** | The Bouncer — verification, consent, safety | Door / verification flow |
| **The DJ** | The Floor — announcements, song chat energy | Events / matches |
| **The Bartender** | The Store — gifts come from behind his bar | Gift store |
| **The Hostess** | The Calendar — events, trivia nights | Events / date nights |
| **The Coat Check** | Inventory — "check your coats" (gifts stash) | Inventory UI |

### 5.3 Mechanics (small first — OPEN details)

- **Relationship levels** per character (friendship meter): verification
  (Brutus), first event (DJ), first gift (Bartender), first trivia (Hostess).
- **Triggered dialogue moments** — short (~30s) scripted scenes at milestones
  and occasional ambient moments. Scripted and cheap now; DeepSeek-backed
  conversational characters later (connector already linked in Vercel).
- **Collectible character cards** — feed Phase 5 Gems/collectibles economy.
- **Guardrail:** characters are *clearly* characters (like the DJ's
  announcements). No NPC-driven fake engagement, no fake likes from
  characters. Scripted fun is honest fun.

### 5.4 Asset contract (founder → app)

- **One character = one folder:** `public/personas/{slug}/` (e.g.
  `public/personas/brutus/`) with `portrait`, full-body shots, and a 6–10s
  scene video.
- **Asset-driven engine:** a `characters` table stores name, role,
  image/video URLs, greeting lines, relationship thresholds, and
  `persona_prompt` (reserved for the conversational layer). Dropping a new
  character in = new row + folder, no code change.
- Founder's persona system ("the AI thinks it IS the persona") plugs into
  `persona_prompt` when we turn on conversational dialogue.

## 6. Shared Principle — The Modular Club (LOCKED as philosophy)

- The **event-driven platform** framing: the calendar is the product.
- Every activity is a **pluggable mechanic** — grid (Dance Floor), rotation
  (Speed Dating), round-based (Trivia), economy (Gifts), atmosphere
  (Characters). New kinds slot into the existing events/entries/token engine
  with no new architecture.
- **Stale events get swapped, not patched**: retire a kind → the scheduler
  stops creating it → the new hot thing takes the slot (mimic what's popping
  IRL).
- This is why everything stays modular *now*, while it's cheap: the building
  can change its whole personality without a remodel.

## 7. Open Questions (need founder sign-off before build)

1. **Basket pass floor** — my lean: pass = sender's floor (keeps "never buy
   above your floor" honest). Confirm or override.
2. **Trivia entry** — on-demand in-chat first (my lean) vs scheduled event
   first. Both eventually.
3. **Character relationship rewards** — badges/streaks/cards only (my lean)
   vs any token involvement. (Lean keeps the economy clean.)
4. **Gift-send cooldown** — 1/hour confirmed; per-gift-type vs global
   (assumed global).
5. **Announcement tone** — anonymous confirmed; whether the ticker also shows
   on the landing/marketing page or only in-app (assumed in-app only).

## 8. Roadmap Placement

- **Phase 5 — Economy+** (`PRD-foundation.md` §11): Gems/collectibles, gifts,
  giveaways, referral dashboard. The Store Wing is Phase 5's anchor.
- Build order proposal: **Characters schema + asset pipeline first** (founder
  art lands against a ready contract) → **Gift Store** → **Couple Trivia**.
- The Hourly Playlist (v0.4) already proves the modular calendar; these
  modules extend it.
