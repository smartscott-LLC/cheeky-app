# Club Cheeky — Feature PRD: L³ (Leave · Like · Love)

> Status: **DRAFT** (2026-08-07) — founder's design; not yet built.
> Extends `PRD-foundation.md` (mission guardrails, floors, matchmaking).
> Companion: `AGENTS.md`.

## 1. TL;DR

**L³ (pronounced "L-cubed") is the Club Cheeky matchmaking mechanic** — same
matchmaking concept as the rest of the app, different element. Instead of one
profile at a time with a yes/no swipe, L³ shows **three profiles at once** and
the member ranks them: **Leave / Like / Love**. Both Like and Love are real
signals (Leave is the only "no"). The gimmick is the point: a forced 1-2-3
allocation inverts the default of binary swiping — the "no" becomes a conscious
choice and the "maybe" becomes a signal, so **the scarce side (women) naturally
emits two signals out of three** instead of skipping almost everyone. More
signals → more matches → a warmer market on both sides.

**Love pays.** Picking Love carries a real reward (see §5), so Love stays scarce
and meaningful instead of being hoarded or diluted.

## 2. Why — the problem it solves

- **Binary swiping has a built-in "no" bias.** Skipping is the default, so most
  profiles produce zero signal. Engagement per profile is near zero for most
  users.
- **The gender imbalance is a signal problem, not a population problem.**
  The scarce side holds the match economy. If the scarce side emits ~2 signals
  per 3 profiles instead of ~0–1 per 10, both sides match more and the network
  warms up — men get matched, so men stay.
- **It's ownable.** "L³" is a name and a brand, not a swipe clone. It becomes
  *the* Club Cheeky way to meet, and it feeds the same matches table the events
  already use.

## 3. The mechanic

- The member is shown **three profiles at once** (a "trio").
- Each profile is assigned one of three slots, in order:
  - **Leave** — not for me. Silent, private, no follow-up, never announced.
  - **Like** — maybe. A real signal.
  - **Love** — definitely. The strong signal, with a reward (see §5).
- The deck is finite per session; after assigning all three, the next trio loads.
- L³ is available to **Silver+ (verified) members** — Guests never see it.
  Blocks are honored; no profile you've blocked appears, and vice versa.

## 4. Matching tiers (TIER award system by match strength)

The reward ladder is set by the strength of the mutual signal. Leave kills it
at any level — zero and zero, or zero and one, generates a plain nothing.

| Your pick | Their pick   | Tier                 | Result                                            |
| --------- | ------------ | -------------------- | ------------------------------------------------- |
| Leave     | anything     | — (no match)         | **Nothing. Silent.** No follow-up, no nudge.       |
| Like      | Like         | **T1**               | Match + 5 free messages each in that match        |
| Like      | Love         | **T1**               | Match + 5 free messages each (the Like pulls it   |
|           |              |                      | down — same T1 as two Likes)                       |
| Love      | Love         | **T2 — the super match** | Match + 5 free messages each + a gift from the |
|           |              |                      | catalog (the club pops the cork)                  |

- **T1 = “we match, and the club gives us a line.”** 5 free messages *each*
  (10 total) scoped to that match — they count against nothing; they're an
  earned allowance, not a purchase. Never shrinks the free tier.
- **T2 = “boom, super match.”** Everything in T1 plus a **gift** granted to
  each member from the gift catalog — a real, announced win (wins are public;
  losses stay silent).
- **Signal-inflation guard:** the dials (gift pool, message count, whether T1
  stays a match at scale) are config values, not rebuilds. At launch, volume
  is a feature; at scale, the tiers protect the scarce side from floods.

## 5. Why Love pays — the tier rewards

Pick Love and you've made the strongest move in the club. The tier rewards
make Love the *fun* pick, not the risky one:

1. **T1 — the free line.** A match plus **5 free messages each** scoped to
   that conversation — even if a free tier is at the daily cap, this match's
   line drops in and they can reply. It's **earned by mutual consent, never
   purchased** — it never shrinks the free tier and never involves tokens.
2. **T2 — the super match.** Everything in T1, plus a **gift from the
   catalog** granted to each member. The club pops the cork. Announced as a
   win (public win, silent loss — the Leave stays quiet).
3. **Cross-floor visibility — both directions.** A Love slot can surface
   someone from a floor **above** yours — a Silver can see a
   Gold/Platinum/Diamond face they'd never meet in the lobby. It works in
   **reverse too**: upper-tier members get downstairs faces in their trios
   (a Diamond can meet a free-tier Silver they'd never see upstairs).
   Mutual Love across floors still matches at T2 (both chose it — consent,
   not a messaging-down violation). The side effects compound: the lower
   floor gets the "climb fever" (a world above them makes the membership
   want itself) and the upper floor gets the "pull-up" (a free-tier match
   gets invited up — the upgrade happens through the member, not the
   paywall).
4. **Metrics.** Love/Like/Leave rates and tier outcomes become the club's
   dashboard — who loves, what converts, which floors the fever actually
   moves people up.

## 6. Guardrails (binding — from PRD-foundation.md)

- **No dark patterns.** L³ never fakes interest, never inflates with bots,
  never shames a Leave. Leave is silent loss; matches are public wins.
- **The free tier stays generous.** The instant-message reward **adds** to the
  free tier; it never replaces or shrinks the 30 msgs / 5 new conversations.
- **Tokens are never on messaging.** The reward is earned, not purchased.
  L³ itself is free for Silver+; tokens are not involved anywhere in it.
- **No follow-ups after a decline.** A Leave never produces a "they'd love to
  hear from you" nudge.
- **Consent overrides floor rules, never the reverse.** Mutual Love across
  floors opens the conversation because both chose it — this is the one
  deliberate exception to messaging-down, and it is match-only (no cold
  messaging up ever).

## 7. UX sketch

- **Mobile:** a trio of three photo cards in a row. Tap a card, then assign
  Leave / Like / Love (or drag to a labeled slot). After the third assignment,
  the trio advances. One clear "skip trio" if someone genuinely dislikes all
  three — but the layout makes assigning the default.
- **Desktop:** same trio, larger cards, keyboard shortcuts (1/2/3).
- The three slots are labeled and color-tied: **Leave** (zinc), **Like**
  (cyan), **Love** (gold) — the L³ branding moment.

## 8. Metrics (owner dashboard)

- Love rate / Like rate / Leave rate per trio and per user.
- Match conversion: trios seen → matches made.
- Cross-floor match rate + **floor-climb conversion**: upgrade within 14 days
  of a cross-floor match.
- Instant-message reward usage (free-tier members using their Love message).

## 9. Open questions (founder to decide)

1. **Like+Like**: keep as a soft match (launch default per founder), or
   "spark only" from day one?
2. **Where it lives**: a mode inside the Spark List (`/browse`), or its own
   room on a floor / in the lobby? (Founder leaned: browse extension.)
3. **Trio source**: random verified members vs. preference-weighted (floors,
   distance, the Spark List's existing signals)? Start random, weight later.
4. **How the match conversation counts** against the existing rate limits —
   confirm the T1/T2 message allowance bypasses the *cap* (not the *table*),
   so abuse is still rate-limited at the database.
5. **The T2 gift** — **decided: floor-tiered.** A Silver super-match grants a
   Silver-tier gift; a Diamond one gets the top shelf. The gift pool follows
   the floor ladder (same catalog, floor-gated items).

## 10. Out of scope (for now)

- Gamified streaks or "lose your Love if you don't reply" pressure — no.
- L³ as a paid feature — no, it stays free for Silver+ (it's the match engine,
  not a product).
- Weekly themed L³ variants — later, same "1 new icebreaker + 1 new event per
  week" cadence the founder is planning.
