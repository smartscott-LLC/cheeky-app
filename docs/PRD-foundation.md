# Cheeky — Foundation PRD

> The source of truth for the Cheeky product. Locked decisions live here; when a decision changes, update this doc. Companion docs: `AGENTS.md` (how we work), `docs/` (feature PRDs).

## 1. TL;DR

Cheeky is a dating app built like a nightclub. Everyone gets in **free with a verified ID** — "everyone's a VIP with an ID here." The club has floors (Silver → Gold → Platinum → Diamond), live scheduled events (starting with the hourly Dance Floor), and a token economy you can earn into or buy into. The pitch: real connections, real events, genuinely usable free tier, zero gouging. Desktop first, mobile after the product is proven.

## 2. Background

- The incumbents paywall basic function: ~$20/week to even message matches, endless swipes, no actual dates.
- Cheeky's answer is a **place**, not a feed: a club you enter with ID, where the main event is a live, time-boxed, low-stakes matching game.
- The template repo (Next.js + Supabase + Stripe) is already standing: auth, subscription sync, and six Stripe products are live. The dating product itself is greenfield.

## 3. Problem & Target Users

- **The Saturday-night bored:** at home, wants a real shot at someone interesting, tired of swiping into a void and paying to talk.
- **The premium dater:** willing to pay, but not $20/week for the privilege of messaging — wants status that *feels* like status and events worth attending.
- **The safety-conscious:** dating apps feel like spam and catfish factories; verification-as-entry is the fix.

Pain points we kill: paywalled messaging, silent rejection, ghosting, post-rejection harassment, dead-end swipes.

## 4. Goals & Success Metrics

- **Guest → Silver conversion** — target ≥ 30% within 7 days of signup (verification is free + pays 20 tokens, so the bar is friction, not money).
- **Event attendance & return** — ≥ 40% of Dance Floor participants attend another event within 7 days; ≥ 10 avg participants per round once a city is seeded.
- **Retention** — D7 retention of verified users ≥ 20%; hourly event cadence is the retention engine.
- **Economy health** — ratio of tokens earned (verify/referral/giveaways) vs purchased; target ≥ 30% earned so the economy never reads as pay-to-win.
- **Revenue** — MRR, Silver → Gold upgrade rate, token purchase rate per 1,000 active users.
- **Safety** — report rate < 1% of active users/month; verified-only events keep the floor clean.

## 5. Solution Overview — Three Pillars

### Pillar 1: The Ladder

| State | Access | What you get |
|---|---|---|
| **Guest** (no card) | Street / tutorial zone | 3 photos, birthday, terms. Club Floor: browse, swipe, match, chat. Matched = free chat. 5 outbound msgs/day to unmatched. **No events, no tokens** — window view only (marquee, blurred grid, live match ticker). |
| **Silver** (verified, **free**) | Through the door | ID + selfie verification → Silver card + VIP badge + **20 tokens instantly**. Event access. Visible to all floors in events. Guest passes. |
| **Gold** ($9.99/mo) | Floors 5–7 | Themed nights (5 tokens), more events, message down, boosted visibility. |
| **Platinum** ($19.99/mo) | Upper floors | Speed Dating (25 tokens), more exclusive events, message everyone below. |
| **Diamond** ($29.99/mo) | Penthouse (A floor) | Rooftop pool parties (~40 tokens), priority conversations, guest passes, whole-building access. |
| **Gems** (later) | Collectibles | Ruby / Emerald / Sapphire / Topaz — limited, exclusive benefits, status. |

Rules that make it fair:
- **Upper floors can message down.** A paid member can always engage a lower floor — the member initiates.
- **Everyone's a VIP with an ID.** The only price of admission is being a real person. Money buys floors, not entry.
- **Guest pass:** a member can bring a Guest up for 24 hours — free referral + FOMO loop.

### Pillar 2: The Event Engine

The **Dance Floor is the reference event**; every floor reskins it with a pricier ticket (Gold themed night 5 tokens, Platinum Speed Dating 25, Diamond rooftop ~40). Build the engine once, curate events forever.

**Dance Floor spec (locked):**
- Runs **every hour on the hour** — appointment commerce; timezone-proof; "next one in 40 minutes" keeps people idling in the club.
- Entry: **reserve 3 tokens** (a hold, not a debit). Balance is pre-checked before reserving; insufficient → top-up path (buy a pack or earn via referral). No match or timeout → **hold released**; match → **hold converts to spend**. No refund race, no double-writes.
- Grid: up to **10×10** of participant photos, badges visible (VIP, floors). 2-minute selection round.
- **Click budget** (~10 favorites/round): scarce clicks make a match meaningful, prevent lottery degeneracy.
- **First mutual click wins — instant match.** No post-round resolution. Once matched, both are locked out of the round and shown as *dancing* live in the grid — the pool thins, FOMO rises, the round gets hotter.
- The match: **one song (~3 min) private chat** — countdown, pre-loaded icebreakers, report/exit button, either side can end early.
- After the song: **Continue** → becomes a normal match with the "Met on the Dance Floor" badge. **Decline** → chat closes, no follow-ups, no re-match in the next round.
- Minimum fill (e.g., 20) or the event cancels with refunds.
- Scheduling: hourly Dance Floor + later, daily/weekly **headliner** events on Gold+ and rare exclusive events (fewer, pricier, status).

### Pillar 3: The Token Economy

- **Earn:** +20 on verification (one-time), +20 per verified referral, giveaways (we'll do lots — tokens cost nothing and drive the economy).
- **Buy:** 100 tokens / $4.99 (5¢ each) and 1000 / $9.99 (1¢ each). Ratios are deliberate — small pack for floor-1/Gold spenders, bulk pack for whales.
- **Spend:** events priced per floor. Token *price* scales steeply (3 → 5 → 25 → 40) while real *money* per event stays roughly flat — status costs what it looks like it costs. Spenders want to feel like spenders; whales and $10 spenders look the same on the surface — no pay-to-win feel.
- **Design rule:** the 20/3 remainder trap is intentional (6 free events, then 2 tokens that can't buy anything). No 2-token events. Ever.

### Governance layer — "Brutus the Bouncer"

The club's rules are written before the code (see `docs/Governance/`): 18+ gate, verification-as-door-check, consent, report/block/ban, the no-follow-up rule, retention/deletion, refunds. All governance surfaces speak the club's voice — the bouncer, not the paperwork. Drafts require legal review before public launch.

### Architecture — one engine, modular floors

The club is **one Next.js app** with a core and per-floor modules — not N
separate apps/PWAs. Isolation comes from entitlements + RLS at the data
layer, not from process separation.

- **The core (the hub):** auth, identity (Brutus), wallet (`token_ledger`),
  entitlements (subscription → floor access), governance (consents, reports,
  blocks), and the **promotion engine** (what's available to the member and
  how the next perk is surfaced — value-first, never dark patterns). Lives in
  `utils/` + core routes (account, verify, messages, browse).
- **Floor modules (the spokes):** `app/(floors)/gold|platinum|diamond` — each
  a *folder* (not a single file) with its own layout (importing the base
  floor layout), skin (palette from `styles/palettes/`), entitlements,
  pricing, and rooms. The first floor (Silver/club) is the base itself.
- **Base floor layout + config:** `layouts/floor-base.tsx` +
  `config/floors.ts` (palette, access, pricing, rooms). Add a room to the
  base and every floor gets it, themed by its config.
- **Access hierarchy (free security):** higher floors can reach lower floors;
  lower floors can never reach higher. Enforced by RLS + entitlements at the
  data layer — never just hidden UI.
- **Component reuse:** `components/ui/*` are shared; floors theme them via
  floor tokens (CSS variables). One component can serve many floors with
  different skins without entangling.
- **Guest passes:** a member's pass lets a Guest temporarily experience a
  floor; routing still goes through the core.

## 6. User Experience — Key Flows

1. **Signup → Guest:** email signup, up to 3 photos, birthday, terms. Land on the street: marquee for the next event, blurred grid, ticker of live matches. Browse, swipe, match, chat with other Guests. The upgrade banner: *"Your ID gets you through the door. Get your Silver card — it's free."*
2. **Verify → Silver:** Brutus the Bouncer conducts the check — name + date of
   birth + government ID number via Stripe Identity (US SSN currently; selfie
   check available for international coverage), ~60 seconds, **20 tokens land
   instantly** → join the next Dance Floor within the hour.
3. **Dance Floor:** join with 3 tokens → grid → 2 min to pick → mutual click = "You're dancing with X" + announcement hype → one song → continue (match + badge) or decline (closed, no follow-ups).
4. **Climb:** upgrade to Gold/Platinum/Diamond anytime from the floors page; entitlements apply instantly.
5. **Guest pass:** a member invites a Guest up for 24h; Guest gets the tour and a reason to verify.

## 7. Requirements (acceptance criteria)

- Guest can complete signup with email + 3 photos + birthday and reach Club Floor in < 60 seconds.
- Matched conversations are always reachable; messaging caps are generous, not walls: **Free/Silver 30 msgs/day + 5 new conversations; Gold 75 + 15; Platinum unlimited + 40; Diamond unlimited + 100** (enforced server-side by tier).
- Tokens are spent **only on events and specialties** — never on messaging. Event song chats do not count against daily messaging limits.
- Guests and Silver post up to **3 photos** and can view up to **3 of another member's photos** (primary + 2); paid floors post and view more (Gold 6 / Platinum 8 / Diamond 10 — configurable per floor).
- Message retention is member-chosen (3 days–3 months) at profile creation and enforced by purge; the stricter participant's window applies to shared conversations.
- Verification issues Silver card + VIP badge + 20 tokens instantly on success; failures are explainable and retryable.
- Dance Floor runs on schedule; entry, click budget, instant mutual-match, lock-out, song chat, refunds, and post-song continue/decline all behave per spec.
- Floors are enforced at the **data layer** (RLS/entitlements), not just hidden in UI.
- Token balance is a **server-side ledger**; every spend/earn/refund is atomic and auditable; no client-side trust.
- Report → block → human review path exists from inside any chat, including event songs.
- Declined matches cannot message the other person again; no re-pairing in consecutive rounds.

## 8. Out of Scope (for now)

- Mobile apps (desktop-first; phones after the product is proven)
- Gems / collectibles / gifts
- AI matching, video chat, voice chat
- Government-ID tier beyond selfie + ID verification
- City-based event scheduling (hourly cadence covers timezones)
- Moderation ops tooling beyond report/block/ban basics

## 9. Open Questions

1. Exact click budget (10 is a starting default) and grid min-fill threshold.
2. Do Guests appear in event grids (blurred) or are they invisible? (Blurred = FOMO; invisible = clean.) 
3. Launch strategy — which city/cities seed the first 1,000 verified users, and how?
4. ~~Verification provider choice & per-verify cost ceiling~~ **Resolved:** Stripe Identity, ID-number lookup (name + DOB + government ID, US SSN currently), ~$1.50/verify; selfie method (~$0.50) available to flip on for international coverage.
5. Headliner event cadence once Gold+ lands (daily? themed by weekday?).
6. Gem scarcity model — how many of each, how they're earned vs bought.

## 10. Assumptions

- Stripe Identity ID number verification costs ~$1.50/verify at launch
  volumes (US SSN only; selfie method ~$0.50 when enabled for international).
  **(Confirmed by founder — watch as a per-user CAC metric.)**
- Hourly Dance Floor can fill ≥ 20 participants once a metro area has ~1,000 verified users. **(Medium — needs a seed test)**
- The "silent loss" design (private refunds) actually reduces churn vs. visible rejection. **(Medium — validate in beta)**
- Referrals (+20 tokens) will be the primary earned-token driver; giveaways are a marketing lever, not a liability. **(High)**

## 11. Roadmap

| Phase | Ships | Status |
|---|---|---|
| 0 — Foundation | Rebrand off the template, docs (this PRD + AGENTS.md), infra in place | ✅ Done (tag `v0.1-door-open` at 1B) |
| 1 — Club Floor | Profiles, verification (Stripe Identity), browse, match, chat, free-tier limits | ✅ Done (tag `v0.1-floor-1-locked`) |
| 2 — Event Engine | Dance Floor: scheduling, grid, pairing, song chat, token wallet + refunds | 🔨 In progress (`feat/event-engine`) — schedule, holds, grid, instant pairing live |
| 3 — Entitlements | Subscription-gated floors at the data layer, guest passes | ⏳ |
| 4 — The Floors | Gold/Platinum/Diamond events, themed nights, Speed Dating, rooftop, visibility boosts | ⏳ |
| 5 — Economy+ | Gems/collectibles, gifts, giveaways, referral dashboard | ⏳ |
| 6 — Mobile | iOS/Android from the desktop-proven product | ⏳ |
