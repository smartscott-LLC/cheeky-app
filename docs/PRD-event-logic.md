# PRD — Event Logic (Refined)

**Status:** DRAFT — founder dictation captured 2026-08-06, pending his confirmation before implementation. Supersedes the event mechanics in `PRD-foundation.md` where they conflict (foundation stays the north star; this is the refined floor/event logic).

---

## 0. The strategy — playing defense on the gender ratio

The number-one killer in dating apps is **imbalanced sex ratios** — 70% male / 30% female is the borderline; below that the app dies. The big players attack the problem offensively (millions spent targeting cities/college demographics — and most still fail).

Club Cheeky plays **defense**: instead of fighting the ratio, we **design events that run multiple men to one woman**, so a skewed user base still produces alive, fair-feeling rooms — "freedom through conformity. Inclusive, not exclusive." The games make a 5-to-1 room feel like a 50/50 one. More events in this family are in the pipeline.

## 1. The lineup — one event per floor

| Floor | Event | Time | Token cost | Round type |
|---|---|---|---|---|
| Silver (free) | **The Dance Floor** | :00 | 3 | 2-min grid, one round |
| Gold | **Blind Date** | :15 | TBD (proposal: 15) | Panel Q&A — one chooser, several suitors |
| Platinum | **Speed Dating** | :30 | 25 | Rotating 1:1s → ranked selection |
| Diamond | **The Rooftop** | :45 | 40 | Multi-round pool, fast rounds |

**Themed Night is retired.** It was the Dance Floor with a different skin — the skin/theme concept stays (rooms keep their vibe and palette), but the Gold slot is now Blind Date, the first of the founder's new event family.

## 2. Refund policy — Dance Floor ONLY

- **The Dance Floor is the only refund floor.** No-match → the 3-token hold releases, member pays nothing. Free-tier protection.
- **Gold and up = pay-for-play.** No refunds on Blind Date, Speed Dating, or the Rooftop — win or lose, the ticket is spent.
- **Canceled events always refund** (all floors). Nobody played → everybody gets their hold back.
- Speed Dating and the Rooftop are designed so the member is **almost always matched anyway**, which makes no-refund fair. Blind Date is the exception: **you're paying for a chance** — if you're not selected, that's on your answers.

## 3. Blind Date (Gold, :15) — "you're paying for a chance"

**What it is:** one chooser on one side, 3–5 suitors on the other. She's deciding on **personality only** — she sees the suitors' photos **blurred**; they see her normally. This is the gender-defense event: 3–5 men in the room, one woman, and it feels like a fair game — not a sausage fest.

**The flow:**
1. **Entry** — suitors pay the entry ticket for a chance. The chooser plays free — she's the one who decides, and she leaves with a match.
2. **The room** — she can't see their faces, they can see her.
3. **The rounds** — **4 regular rounds.** Each round: she asks ONE question, everyone answers privately (suitors **never** see each other's answers — only she does), she gives **one tally mark** to the answer she likes best.
4. **The standing** — the room **does** see who received each tally. You have to know where you stand, because you can change your answers up in later rounds based on it. Answers stay private; the tally is public.
5. **The final** — ties are designed to happen (that's why 4 rounds, not 5). A tie → a **final round, made a big deal** — one last question, one last tally, and it's decided.
6. **The match** — most tallies wins the date: matched + private chat (and the room's badge). Everyone else: the ticket is spent, that's on their answers.
7. **Cancels/edge** — under-filled room (fewer than 3 suitors, or no chooser) → canceled → refunds. Chooser disconnects mid-event → cancel + refund everyone (graceful failure).

**Always one woman, men always pay.** That's the rule. Role reversal (a man choosing among women) only happens as a **special event** — e.g., a semi-famous/influencer seat that pulls a crowd — and even then the design keeps the man-heavy balance in mind so everyone stays busy.

**The money:** men pay for the chance, no refunds once the room runs. Canceled room → refunds. Exact ticket TBD (proposal: 15 — above the 5-token grid, below the 25 speed dating).

## 4. Speed Dating (Platinum, 25 tokens) — "pay for the opportunity"

**What you're buying:** the chance to sit down with up to 5 people you could never message outside the game (messaging requires a match — you can't cold-message).

**The round:**
1. Groups of up to 6, sorted by orientation preference.
2. **Rotating 1:1 sessions, 90 seconds each.** 5v5 → 7.5 minutes of continuous rotation.
3. At the end, **rank everyone you met, full order: 1 = most wanted … 5 = least wanted** (not top-plus-alternate).
4. **Resolution:** strongest mutual preferences match first — and matched members move to private chat with their Speed Dating certificate.
5. **The economics: everybody (almost) always gets matched.** Even the last-ranked member is someone's last pick. "If you're not 5, you're 1." The 25 is essentially always spent.

**The money:**
- The 25 is **held** as insurance through the event (protects against mid-game failure / disconnects).
- It **charges after the selection round resolves** — held through the rotation AND the selections.
- **No refunds.** A member may exit and not date anyone — the charge stands. No "pay 25, exit, repeat."
- **Disconnect:** file a claim (report it); tokens returned on review unless the pattern looks habitual (abuse).

**What nobody sees:** who has already matched or come off the board — same as the Dance Floor.

## 5. The Rooftop (Diamond, 40 tokens) — the multi-round pool

Not a reskin of the Dance Floor:

1. **Fast rounds — 10 seconds each.** "You got 10 seconds to put in three picks."
2. Each round you fire **3 picks** at the pool.
3. At the end of the 10 seconds, mutual picks **match instantly** and the couple is **escorted off the board** (visible — the pool needs a board that shrinks).
4. **Rounds repeat until everybody's matched or everybody leaves.** ~5 rounds for 10 people. You wind up in a 1-on-1 round eventually — and the final pair **matches automatically**. You always get picked at least once.
5. **The money:** 40 tokens, charged, **no refunds** — "no reason to refund money because you're gonna get paid."

**What IS shown:** couples being pulled off the board each round (required by the pool format). The Dance Floor and Speed Dating keep matches hidden.

## 6. Icebreakers — a NEW category, not an event

- **Under the Event Center as its own category: "Icebreakers."**
- **Not event-driven, not paid.** Things two **already-matched** people can do together instead of staring at empty chat.
- **Date Night moves here.** One active game per pair, 5 questions from a pack, both partners tap the same option to lock and score, skip/timeout = missed, rewards are badges/streaks only — no tokens.
- **The pipeline:** more icebreaker activities later.

## 7. Membership token grants — tokens with every membership

Every paid membership comes with tokens, **every cycle** — this is what makes the free floors survivable AND juices the first week:

| Membership | Price | Tokens per cycle | ≈ value at pack pricing |
|---|---|---|---|
| Silver (free) | $0 | 20 (at verification, existing) | — |
| Gold | $9.99 | **100** | ~$4.99 |
| Platinum | $19.99 | **200** | ~$9.98 |
| Diamond | $29.99 | **500** | ~$24.95 |

- **The point:** 100 tokens = one big event a week (25/week). Fair and reasonable.
- **Diamond becomes the deal that can't be ignored** — 500 tokens ≈ $24.95 of value on a $29.99 membership.
- **The meta-game (we WANT this):** people do the math — Platinum + a 1000-token pack ($19.99 + $9.99 ≈ Diamond's price) and think they beat the system. Great — either way they're engaged and spending.
- Grants flow through the subscription webhook (idempotent, ledger-only, reason = membership tier) **every cycle — monthly, part of the membership package itself**. Upgrade mid-cycle → the new tier's grant lands immediately. Existing token packs unchanged.
- **No gift add-ons with memberships** — tokens are the perk (a gift was considered; tokens won it).
- First-week kicker: giveaways + membership grants = tokens flying around → gifts, swag, teddy bears — the excitement loop.

## 8. Open questions (not blocking the engine fix)

1. **Blind Date ticket price** — proposal is **15 tokens** (above the 5 grid, below the 25 speed dating). Founder hasn't set it; 15 stands unless he says otherwise.
2. **The chooser's seat at launch** — with few members online early, the :15 room may sit empty. Real members only, or do the crew AI characters hold a seat so the room is always playable? (Pending.)

## 9. Implementation delta (when greenlit)

1. **`finalize_events` — the engine fix. IN PROGRESS.** Everything gets finalized across the board, every floor, refund or not. The minute hand is dead (variable `e` collides with the `events` alias; cron fails every minute; 264 events stuck open; no event has ever transitioned). Fix it, period.
2. **Blind Date:** new event kind on the Gold slot (:15) — replaces Themed Night; new room (panel Q&A — not the grid engine); ticket + tally + final-round resolution; cancel/refund rules above.
3. **Membership token grants:** subscription webhook credits 100/200/500 per cycle, idempotent, ledger-only.
4. **Speed Dating:** full 1–N ranking replaces top-plus-alternate; settlement = charge all participants after selection resolution (no refunds); claims path for disconnects; matches stay hidden.
5. **The Rooftop:** new multi-round engine (10s rounds, 3 picks, pool elimination, visible pull-offs, automatic final-pair match, charge always).
6. **Date Night:** relabeled/moved into the Icebreakers category; fix the mutual-lock bug (first tap currently resolves the round as missed — the game can never score).
