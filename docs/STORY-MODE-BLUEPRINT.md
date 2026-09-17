# Club Cheeky Story Mode Implementation Blueprint

**Feature:** The Chase to the Coat Check — An Interactive Story RPG
**Status:** Development roadmap
**Last updated:** 2026-09-01

---

## Overview

A guided, narrative adventure that onboards new verified users through the Club floors while teaching app mechanics, rewarding engagement with tokens and exclusive collectibles, and introducing the Coat Check AI persona (unlocked on completion). Users can replay the story to improve their score and unlock higher-tier prizes.

**Core pillars:**

- ✅ Mobile-first narrative (short, punchy dialogue + inline choices)
- ✅ Prize system: one-time-per-tier rewards — Silver → Gold → Platinum → Diamond, plus a special Perfect Score prize
- ✅ Replayable: different AI dialogue each run; users retry to earn higher-tier prizes they missed
- ✅ +50 bonus tokens on first story completion (separate from 25 startup tokens)
- ✅ Integrates existing systems: real events, real token holds, real chat rooms

---

## User Flow (Mobile-First)

### Entry

1. User verifies ID → Silver card + 25 tokens → redirected to `/club` (lobby)
2. Onboarding prompt: "Meet your dream date — find them through the Club"
3. CTA: "Start the Chase" → enters story mode at `/story` (outside the club)
4. **Progress state:** `user_story_progress` table tracks beats, choices, score, rewards

### Story Beats (5 beats)

| Beat                         | Location                  | Duration | Mechanics                              | AI/Event Role               | Learning Goal                             |
| ---------------------------- | ------------------------- | -------- | -------------------------------------- | --------------------------- | ----------------------------------------- |
| **1: The Street**            | Outside the club          | ~2 min   | Intro dialogue + 1 choice              | Chaz or Brutus greets       | "Here's what the Club is"                 |
| **2: Silver Floor**          | The Lobby/Dance Floor     | ~3 min   | Meet crew member + event participation | DJ (D34D_B34T) or crew      | "How tokens + events work"                |
| **3: Gold Floor**            | Gold floor room           | ~3 min   | Dialogue choices + gift mechanic intro | Roxy (mixologist)           | "Gifts show interest; buy with tokens"    |
| **4: Plat/Diamond Gauntlet** | Platinum & Diamond floors | ~4 min   | Speed mini-game or decision tree       | Trixie + Valentina          | "The higher floors reveal more"           |
| **5: Rooftop Finale**        | Coat Check / Rooftop      | ~3 min   | Meet the Coat Check AI + final choice  | Coat Check AI (new persona) | "The dream date is here; you unlock this" |

**Total story time:** ~15–17 minutes for first playthrough (mobile-friendly, not a slog).

---

## Database Schema

### New Table: `user_story_progress`

Tracks state, score, and rewards for each user's story run(s).

```sql
CREATE TABLE user_story_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,

  -- Current run
  current_beat INT DEFAULT 0,           -- 0 = before start, 1–5 = beat number, 5+ = complete
  choices_made JSONB DEFAULT '{}'::jsonb, -- { "beat_1": "choice_A", "beat_3": "choice_B" }
  current_score INT DEFAULT 0,

  -- Completion & rewards
  is_complete BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMP WITH TIME ZONE,
  final_score INT,

  -- Reward tracking (one-time per tier, per user)
  reward_tiers_claimed JSONB DEFAULT '{}'::jsonb, -- { "silver": true, "gold": true, "platinum": true, "diamond": true, "perfect": true }
  last_tier_earned TEXT,                 -- 'silver', 'gold', 'platinum', 'diamond', 'perfect'

  -- Metadata
  total_runs INT DEFAULT 1,              -- increments if user restarts after completion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: users can read/update only their own row
ALTER TABLE user_story_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_read_their_story_progress"
  ON user_story_progress FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users_can_update_their_story_progress"
  ON user_story_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### New Table: `story_beat_completion`

Tracks which beats users have completed (for replay detection and analytics).

```sql
CREATE TABLE story_beat_completion (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  beat_number INT NOT NULL,             -- 1–5
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  choice_made TEXT,                      -- the choice the user picked at this beat
  score_earned INT                       -- points from this beat
);

ALTER TABLE story_beat_completion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_read_their_beat_completions"
  ON story_beat_completion FOR SELECT
  USING (auth.uid() = user_id);
```

### Updated Table: `collectibles`

The story completion unlocks collectibles. Each tier's prize is added here:

```sql
-- Seed collectibles for each tier
INSERT INTO collectibles (id, name, description, icon_url, tier, unlock_condition) VALUES
  ('badge-apprentice', 'The Apprentice', 'Your first step into Club Cheeky.', '/cheeky_icons_and_things/badge_new_arrival.webp', 'silver', 'story_tier:silver'),
  ('badge-dater', 'The Dater', 'You learned the rhythm of the Club.', '/cheeky_icons_and_things/badge_first_date.webp', 'gold', 'story_tier:gold'),
  ('badge-romantic', 'The Romantic', 'You climbed the floors and found connection.', '/cheeky_icons_and_things/badge_spark_finder.webp', 'platinum', 'story_tier:platinum'),
  ('badge-dream-keeper', 'The Dream Keeper', 'The Club revealed its secrets to you.', '/cheeky_icons_and_things/badge_date_master.webp', 'diamond', 'story_tier:diamond'),
  ('badge-legend', 'The Legend', 'Perfect score. You are Club Cheeky.', '/cheeky_icons_and_things/badge_chat_champion.webp', 'perfect', 'story_tier:perfect'),
  ('coat-check-sasha-blonde', 'Sasha — Blonde Thai', 'Warm, radiant, the life of every afterparty.', '/coat_check/Sasha v2 – Blonde Thai.webp', 'diamond', 'story_mode:platinum_plus'),
  ('coat-check-sasha-keeper', 'Sasha — The Keeper', 'Chic, magnetic, razor-sharp wit. She runs the VIP coat check.', '/coat_check/Sasha – The Keeper.webp', 'diamond', 'story_mode:platinum_plus'),
  ('coat-check-sasha-edgy', 'Sasha — Black Hair Edgy', 'Bold, confident, always one step ahead of the crowd.', '/coat_check/Sasha v3 – Black Hair Edgy.webp', 'diamond', 'story_mode:platinum_plus'),
  ('coat-check-jax-default', 'Jax — Default', 'Smooth, relaxed, effortlessly cool. He keeps your stash safe.', '/coat_check/jax2.webp', 'diamond', 'story_mode:platinum_plus'),
  ('coat-check-jax-vaultkeeper', 'Jax — The Vaultkeeper', 'Charismatic heartthrob with a crooked smile and rolled-up sleeves.', '/coat_check/Jax – The Vaultkeeper.webp', 'diamond', 'story_mode:platinum_plus'),
  ('coat-check-jax-slicked', 'Jax — Slicked Back', 'Sharp-dressed, confident, the guy everybody wants to chat with.', '/coat_check/Jax v2 – Slicked Back.webp', 'diamond', 'story_mode:platinum_plus');
```

---

## Story Content & AI Prompts

### Beat Structure Template

Each beat has:

- **Opener:** AI greeting or scene-setting (1–2 sentences)
- **Body:** 1–3 dialogue turns or a choice prompt
- **Choices:** 2–3 inline options (each 3–5 words max)
- **Scoring:** Points awarded based on choice quality (see below)

### Beat 1: The Street (Chaz or Brutus Intro)

**Opener:**

> "Welcome to Club Cheeky. I'm **Chaz**, the manager. You're here to find someone special — but first, you've gotta get past the bouncer and learn how the Club works. Ready?"

**Choices:**

- A) "Let's go in." → +5 pts (eager)
- B) "Tell me more first." → +8 pts (curious; AI gives flavor text)
- C) "I just wanna swipe..." → +3 pts (dismissive; AI redirects with flavor)

**Score logic:** Engagement signals (curiosity, respect for the venue) = higher points.

---

### Beat 2: Silver Floor (DJ – First Event Touch)

**Opener:**

> "Yo! I'm the DJ. Every hour on the hour, the Dance Floor opens — it's free, it's packed, and it's where the magic happens. Wanna jump in?"

**Mechanic:** User must **actually join a Dance Floor event** (real token hold, real AI partners). Skippable with a 2pt consolation for users not in the mood.

**In-game result:**

- If they join + stay 2 min: +15 pts
- If they join + leave early: +7 pts
- If they skip: +2 pts (they can still progress)

**Unlock hint:** "You just earned tokens for joining. Spend 'em wisely."

---

### Beat 3: Gold Floor (Roxy – Gift Mechanic)

**Opener:**

> "I'm **Roxy**, the mixologist. On this floor, people send each other gifts to show interest. Want to try?"

**Mechanic:** User is given **3 free tokens** (temporary, story-only hold). They can:

- Buy a gift from the shop (costs 2 tokens)
- Send it to an AI character or another story participant

**Scoring:**

- Buys + sends a gift: +20 pts
- Looks at gifts but doesn't send: +10 pts
- Skips entirely: +2 pts

**Unlock hint:** "Gifts unlock conversations. Remember that in the real Club."

---

### Beat 4: Plat/Diamond Gauntlet (Trixie + Valentina)

**Opener:**

> "I'm **Trixie**, the waitress on Platinum. You made it this far — most don't. Want to meet **Valentina** upstairs?"

**Mechanic:** A small **choice tree** (2–3 decision points) that flavors the dialogue but doesn't lock progression. Each choice signals user archetype (romantic, bold, cautious).

**Scoring:**

- Romantic choices + high engagement: +25 pts
- Bold choices: +20 pts
- Cautious/neutral: +15 pts

**Example choice:**

> "Valentina says, 'Dance with me before we go to the roof.' Do you?"
>
> - A) "Absolutely." → +25 (romantic, engaging)
> - B) "Let's get to it." → +20 (direct)
> - C) "I need a minute." → +15 (cautious, but still progresses)

---

### Beat 5: Rooftop – Coat Check Finale

**Opener (via Coat Check — pick your vault keeper):**

> You reach the top. The Coat Check is open — three women and three men, each ready to manage your vault. Pick the one who feels right.

**Mechanic:** **No choices here — this is the payoff.** A 3×2 selection grid appears: 3 Sasha variants (Blonde Thai, The Keeper, Black Hair Edgy) and 3 Jax variants (Default, The Vaultkeeper, Slicked Back). User picks one — that persona becomes their vault keeper. The other 5 stay unlockable on replays.

- **High score (70+):** "You really understood this place. We'll have a lot to talk about."
- **Medium score (50–69):** "You've got the vibe. Let's get to know each other."
- **Low score (<50):** "You're curious, at least. That's a start."

**Outcome:**

- Story marked complete
- User picks their vault keeper from 6 personas (3 Sasha, 3 Jax) — that persona is unlocked and becomes their Coat Check companion
- The other 5 personas stay available to unlock on future replays (collect them all!)
- Tier badge awarded based on final score
- Prompted to explore the Lounge or real Club

---

## Scoring & Reward Tiers

### Scoring Rules

**Points per beat:**

- Beat 1 (intro): 0–8 pts
- Beat 2 (event): 2–15 pts
- Beat 3 (gift): 2–20 pts
- Beat 4 (gauntlet): 15–25 pts
- Beat 5 (finale): 0 pts (narrative closure, no score)

**Bonus points:**

- Completed all optional tasks: +5 pts
- Skipped no beats: +10 pts (perfect run)

**Max possible: 100 pts**

### Prize Tiers (One-Time Per Tier, Per User)

Each tier has its own exclusive prize. You can only earn each prize once — replay the story to unlock tiers you missed.

| Tier              | Score Threshold | Token Reward | Badge              | Collectible          | Notes                                         |
| ----------------- | --------------- | ------------ | ------------------ | -------------------- | --------------------------------------------- |
| **Silver**        | 0–29            | 10           | "The Apprentice"   | `badge-apprentice`   | Completing the story earns this               |
| **Gold**          | 30–49           | 50           | "The Dater"        | `badge-dater`        | First meaningful token bonus                  |
| **Platinum**      | 50–69           | 100          | "The Romantic"     | `badge-romantic`     | Coat Check personas unlock here (pick 1 of 6) |
| **Diamond**       | 70–99           | 150          | "The Dream Keeper" | `badge-dream-keeper` | Max standard reward                           |
| **Perfect Score** | 100             | 250          | "The Legend"       | `badge-legend`       | Special bonus — only for flawless runs        |

### Prize Claim Mechanics

- **One-time per tier:** Each prize can only be claimed once per user account. If your first run scores 55 (Platinum), you claim Silver + Gold + Platinum all at once. Future runs can only unlock unclaimed tiers.
- **Delta crediting:** If you already claimed Gold (50 tokens) and later earn Diamond (150 tokens), you receive the difference — 100 tokens. No double-dipping.
- **Perfect Score (100pts):** This is a separate bonus tier. Even if you already claimed Diamond on a previous run, hitting a perfect 100 on a replay earns the Legend badge + 250 tokens. It's the chase — the one thing that keeps you coming back to master the story.
- **Replayability:** Users can re-run the story as many times as they want. Only the highest unclaimed tier's tokens are credited per replay. The Perfect Score prize can only be claimed once.
- **Coat Check Personas (6 variants):** Unlock your first pick when you hit Platinum+ (50+ pts). The other 5 unlock on replays. All stay unlocked forever once claimed.

---

## API Routes & Endpoints

### Story Routes

| Route                          | Method | Purpose                                                      | Auth                 |
| ------------------------------ | ------ | ------------------------------------------------------------ | -------------------- |
| `/api/story/start`             | POST   | Initialize story progress for user                           | Verified user        |
| `/api/story/beat/:beat_number` | POST   | Submit beat completion + choices                             | Verified user        |
| `/api/story/complete`          | POST   | Mark story as complete, calculate final score, award rewards | Verified user        |
| `/api/story/progress`          | GET    | Fetch current story state (for resuming)                     | Verified user        |
| `/api/story/reset`             | POST   | Reset story for a fresh run (opt-in)                         | Verified user + flag |

### Client Routes (Next.js Pages)

| Route                  | Component       | Purpose                                              |
| ---------------------- | --------------- | ---------------------------------------------------- |
| `/story`               | `StoryMode`     | Story container (full-screen mobile experience)      |
| `/story/beat/[number]` | `StoryBeat`     | Individual beat UI (dynamic content per beat)        |
| `/story/complete`      | `StoryComplete` | Completion screen (score, prizes, Coat Check unlock) |

---

## Implementation Phases

### Phase 1: Database & API Foundation

- [ ] Create migrations: `user_story_progress`, `story_beat_completion`, `collectibles` seed
- [ ] Write RLS policies
- [ ] Implement `/api/story/*` endpoints
- [ ] Add server-side validation: score calculation, reward idempotency (per-tier, one-time only)
- [ ] Add token crediting to the main ledger (use existing token engine)
- [ ] Perfect Score detection: final score === 100 triggers separate prize logic

### Phase 2: Frontend & UI

- [ ] Create mobile-first UI for story beats
- [ ] Build beat components (dialogue, choices, event integration)
- [ ] Add progress bar / visual floor navigation
- [ ] Build completion screen with all earned prizes displayed
- [ ] Link Coat Check AI persona to chat system

### Phase 3: AI & Dialogue

- [ ] Write beat prompts (5 main + variants for choices)
- [ ] Update `characters` table with Coat Check AI definition
- [ ] Test AI dialogue generation (DeepSeek integration)
- [ ] Validate dialogue variability across runs (seed different context each time)

### Phase 4: Event Integration

- [ ] Hook Beat 2 to real Dance Floor event (token hold, AI participants, skippable)
- [ ] Hook Beat 3 to gift shop (temporary token allocation, gift send)
- [ ] Add story-mode badge/context to events (show "story mode" vs normal)
- [ ] Ensure event results (pass/fail) flow back to story score

### Phase 5: QA & Polish

- [ ] Test full user flow (signup → story → completion → Lounge)
- [ ] Stress test: concurrent story starts, reward claim idempotency
- [ ] Mobile layout validation (iPhone / Android)
- [ ] Proofreading & copy refinement
- [ ] Analytics: track drop-off points, avg score, replay rate, Perfect Score rate

---

## Technical Considerations

### Token Handling

- Story gives **temporary token holds** (don't charge user balance until beat completion).
- On beat completion, holds become permanent ledger entries (server-side only).
- Max holds per story run: ~15 tokens (safe guard against ledger overflow).
- If user abandons mid-story, holds are released (cron cleanup or manual session timeout).

### AI Cost

- 5 beats × ~3 API calls per beat (beat intro + 1–2 dialogue exchanges) = ~15 calls per full run.
- At DeepSeek rates (~$0.0002 per 1K tokens), cost ≈ $0.003–$0.01 per story run.
- Budget: expect ~1K runs/month initially. Monitor and adjust prompt length if costs exceed $30/month.

### Event Integration

- Story-mode Dance Floor event is identical to normal events, but:
  - Only AI participants (no real humans in story runs).
  - Story context added to event object (`is_story_mode: true`).
  - Results fed back to story score (via webhook or direct API call).
- Beat 2 is **skippable** (2pt consolation) — users not ready to engage can still progress.

### Coat Check Personas — 6 Vault Keepers

- All 6 unlock on first Platinum+ completion (50+ pts). **User picks one to unlock first.**
- **3 Sasha variants:** Blonde Thai (warm, radiant), The Keeper (chic, magnetic), Black Hair Edgy (bold, confident)
- **3 Jax variants:** Default (smooth, relaxed), The Vaultkeeper (charismatic heartthrob), Slicked Back (sharp-dressed, confident)
- The other 5 stay available to unlock on replays. All 6 can be collected.
- Once unlocked, a persona stays unlocked — replaying below Platinum doesn't revoke it.
- After all 6 are collected, additional replays let the user pick which one greets them in Beat 5.

### Replayability & Analytics

- Track `total_runs` and `last_tier_earned` per user.
- Highlight Perfect Score achievement in profile/Lounge if user earned it.
- Flag users who replay frequently (>3 runs) — might indicate engagement or frustration.
- Log beat drop-offs: if 60% quit at Beat 4, revisit difficulty/pacing.

---

## Validation Checklist (Before Merge)

- [ ] Database migration applies cleanly (no RLS conflicts)
- [ ] `/api/story/complete` is idempotent — per-tier prizes claimed only once
- [ ] Perfect Score (100) detection awards the Legend badge + 250 tokens, one-time only
- [ ] Token ledger is never written directly from the client
- [ ] Delta crediting: upgrading from Gold→Diamond pays the difference, not the full amount
- [ ] Story beats render on mobile without horizontal scroll
- [ ] AI dialogue is unique across two consecutive runs (test with same user)
- [ ] Beat 2 Dance Floor hold + release works correctly; skip path works too
- [ ] All 6 Coat Check personas load and are selectable on completion (3×2 grid)
- [ ] All 5 collectible badges display in profile & Lounge
- [ ] Reward tier boundaries tested: score 29 (Silver), 30 (Gold), 50 (Platinum), 70 (Diamond), 100 (Perfect)
- [ ] `pnpm lint` + `pnpm test` + `pnpm build` all pass
- [ ] PRD updated with Story Mode feature summary

---

## Future Enhancements (Out of Scope, Phase 6+)

- Branching narrative paths (e.g., "find the dream date" vs "win an event competition")
- Leaderboard: highest story scores
- Story achievements (e.g., "Speed Dating expert" for beating Beat 4 in <2 min)
- Seasonal story variants (Halloween theme, holiday specials)
- Accessibility: screen reader support for dialogue, keyboard navigation

---

## Docs & References

- **PRD Foundation:** `docs/PRD-foundation.md`
- **Game Engines:** `docs/GAME-ENGINES.md`
- **Floors Map:** `docs/floor-map.md`
- **Characters:** `utils/characters.ts`
- **Events Config:** `utils/events-config.ts`
- **Token Engine:** `utils/token-amount.ts` + `/api/webhooks/stripe`
