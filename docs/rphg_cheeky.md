\`\`\`markdown name=STORY-MODE-IMPLEMENTATION-BLUEPRINT.md  
\# Club Cheeky Story Mode Implementation Blueprint

\*\*Feature:\*\* The Chase to the Coat Check — An Interactive Story RPG  
\*\*Status:\*\* Development roadmap  
\*\*Last updated:\*\* 2026-08-31

\---

\#\# Overview

A guided, narrative adventure that onboards new verified users through the Club floors while teaching app mechanics, rewarding engagement with tokens and exclusive collectibles, and introducing the Coat Check vault keepers — 6 personas (3 Sasha, 3 Jax) — unlocked on completion. Users can replay the story to improve their score and unlock higher-tier prizes.

\*\*Core pillars:\*\*  
\- ✅ Mobile-first narrative (short, punchy dialogue \+ inline choices)  
\- ✅ Prize system: Silver → Gold → Platinum → Diamond (one-time reward per tier, per user), plus a special Perfect Score prize (100pts)  
\- ✅ Replayable: different AI dialogue each run; users retry to earn Diamond-tier rewards  
\- ✅ Incentive: \+50 bonus tokens on first story completion (separate from 25 startup tokens)  
\- ✅ Integrates existing systems: real events, real token holds, real chat rooms

\---

\#\# User Flow (Mobile-First)

\#\#\# Entry

1\. User verifies ID → Silver card \+ 25 tokens → redirected to \`/club\` (lobby)  
2\. Onboarding prompt: "Meet your dream date — find them through the Club"  
3\. CTA: "Start the Chase" → enters story mode at \`/story\` (outside the club)  
4\. \*\*Progress state:\*\* \`user\_story\_progress\` table tracks beats, choices, score, rewards

\#\#\# Story Beats (5 beats)

| Beat                             | Location                  | Duration | Mechanics                               | AI/Event Role               | Learning Goal                             |
| -------------------------------- | ------------------------- | -------- | --------------------------------------- | --------------------------- | ----------------------------------------- |
| \*\*1: The Street\*\*            | Outside the club          | \~2 min  | Intro dialogue \+ 1 choice              | Chaz or Brutus greets       | "Here's what the Club is"                 |
| \*\*2: Silver Floor\*\*          | The Lobby/Dance Floor     | \~3 min  | Meet crew member \+ event participation | DJ (D34D\_B34T) or crew     | "How tokens \+ events work"               |
| \*\*3: Gold Floor\*\*            | Gold floor room           | \~3 min  | Dialogue choices \+ gift mechanic intro | Roxy (mixologist)           | "Gifts show interest; buy with tokens"    |
| \*\*4: Plat/Diamond Gauntlet\*\* | Platinum & Diamond floors | \~4 min  | Speed mini-game or decision tree        | Trixie \+ Valentina         | "The higher floors reveal more"           |
| \*\*5: Rooftop Finale\*\*        | Coat Check / Rooftop      | \~3 min  | Meet the Coat Check AI \+ final choice  | Coat Check AI (new persona) | "The dream date is here; you unlock this" |

\*\*Total story time:\*\* \~15–17 minutes for first playthrough (mobile-friendly, not a slog).

\---

\#\# Database Schema

\#\#\# New Table: \`user\_story\_progress\`

Tracks state, score, and rewards for each user's story run(s).

\`\`\`sql  
CREATE TABLE user\_story\_progress (  
id BIGSERIAL PRIMARY KEY,  
user\_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,

\-- Current run  
current\_beat INT DEFAULT 0, \-- 0 \= before start, 1–5 \= beat number, 5+ \= complete  
choices\_made JSONB DEFAULT '{}'::jsonb, \-- { "beat\_1": "choice\_A", "beat\_3": "choice\_B" }  
current\_score INT DEFAULT 0,

\-- Completion & rewards  
is\_complete BOOLEAN DEFAULT FALSE,  
completion\_date TIMESTAMP WITH TIME ZONE,  
final\_score INT,

\-- Reward tracking (one-time per tier, per user)  
reward\_tiers\_claimed JSONB DEFAULT '{}'::jsonb, \-- { "silver": true, "gold": true, "platinum": true, "diamond": true, "perfect": true }
last\_tier\_earned TEXT, \-- 'silver', 'gold', 'platinum', 'diamond', 'perfect'

\-- Metadata  
total\_runs INT DEFAULT 1, \-- increments if user restarts after completion  
created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- RLS: users can read/update only their own row  
ALTER TABLE user\_story\_progress ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "users\_can\_read\_their\_story\_progress"  
ON user\_story\_progress FOR SELECT  
USING (auth.uid() \= user\_id);  
CREATE POLICY "users\_can\_update\_their\_story\_progress"  
ON user\_story\_progress FOR UPDATE  
USING (auth.uid() \= user\_id)  
WITH CHECK (auth.uid() \= user\_id);  
\`\`\`

\#\#\# New Table: \`story\_beat\_completion\`

Tracks which beats users have completed (for replay detection and analytics).

\`\`\`sql  
CREATE TABLE story\_beat\_completion (  
id BIGSERIAL PRIMARY KEY,  
user\_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,  
beat\_number INT NOT NULL, \-- 1–5  
completed\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
choice\_made TEXT, \-- the choice the user picked at this beat  
score\_earned INT \-- points from this beat  
);

ALTER TABLE story\_beat\_completion ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "users\_can\_read\_their\_beat\_completions"  
ON story\_beat\_completion FOR SELECT  
USING (auth.uid() \= user\_id);  
\`\`\`

\#\#\# Updated Table: \`collectibles\`

The story completion unlocks new collectibles and Coat Check vault keepers (6 personas):

\`\`\`sql
\-- Seed collectibles for each tier
INSERT INTO collectibles (id, name, description, icon\_url, tier, unlock\_condition) VALUES
('badge-apprentice', 'The Apprentice', 'Your first step into Club Cheeky.', '/cheeky\_icons\_and\_things/badge\_new\_arrival.webp', 'silver', 'story\_tier:silver'),
('badge-dater', 'The Dater', 'You learned the rhythm of the Club.', '/cheeky\_icons\_and\_things/badge\_first\_date.webp', 'gold', 'story\_tier:gold'),
('badge-romantic', 'The Romantic', 'You climbed the floors and found connection.', '/cheeky\_icons\_and\_things/badge\_spark\_finder.webp', 'platinum', 'story\_tier:platinum'),
('badge-dream-keeper', 'The Dream Keeper', 'The Club revealed its secrets to you.', '/cheeky\_icons\_and\_things/badge\_date\_master.webp', 'diamond', 'story\_tier:diamond'),
('badge-legend', 'The Legend', 'Perfect score. You are Club Cheeky.', '/cheeky\_icons\_and\_things/badge\_chat\_champion.webp', 'perfect', 'story\_tier:perfect'),
('coat-check-sasha-blonde', 'Sasha \u2014 Blonde Thai', 'Warm, radiant, the life of every afterparty.', '/coat_check/Sasha v2 \u2013 Blonde Thai.webp', 'diamond', 'story\_mode:platinum\_plus'),
('coat-check-sasha-keeper', 'Sasha \u2014 The Keeper', 'Chic, magnetic, razor-sharp wit. She runs the VIP coat check.', '/coat_check/Sasha \u2013 The Keeper.webp', 'diamond', 'story\_mode:platinum\_plus'),
('coat-check-sasha-edgy', 'Sasha \u2014 Black Hair Edgy', 'Bold, confident, always one step ahead of the crowd.', '/coat_check/Sasha v3 \u2013 Black Hair Edgy.webp', 'diamond', 'story\_mode:platinum\_plus'),
('coat-check-jax-default', 'Jax \u2014 Default', 'Smooth, relaxed, effortlessly cool. He keeps your stash safe.', '/coat_check/jax2.webp', 'diamond', 'story\_mode:platinum\_plus'),
('coat-check-jax-vaultkeeper', 'Jax \u2014 The Vaultkeeper', 'Charismatic heartthrob with a crooked smile and rolled-up sleeves.', '/coat_check/Jax \u2013 The Vaultkeeper.webp', 'diamond', 'story\_mode:platinum\_plus'),
('coat-check-jax-slicked', 'Jax \u2014 Slicked Back', 'Sharp-dressed, confident, the guy everybody wants to chat with.', '/coat_check/Jax v2 \u2013 Slicked Back.webp', 'diamond', 'story\_mode:platinum\_plus');
\`\`\`

\---

\#\# Story Content & AI Prompts

\#\#\# Beat Structure Template

Each beat has:  
\- \*\*Opener:\*\* AI greeting or scene-setting (1–2 sentences)  
\- \*\*Body:\*\* 1–3 dialogue turns or a choice prompt  
\- \*\*Choices:\*\* 2–3 inline options (each 3–5 words max)  
\- \*\*Scoring:\*\* Points awarded based on choice quality (see below)

\#\#\# Beat 1: The Street (Chaz or Brutus Intro)

\*\*Opener:\*\*  
\> "Welcome to Club Cheeky. I'm \*\*Chaz\*\*, the manager. You're here to find someone special — but first, you've gotta get past the bouncer and learn how the Club works. Ready?"

\*\*Choices:\*\*  
\- A) "Let's go in." → \+5 pts (eager)  
\- B) "Tell me more first." → \+8 pts (curious; AI gives flavor text)  
\- C) "I just wanna swipe..." → \+3 pts (dismissive; AI redirects with flavor)

\*\*Score logic:\*\* Engagement signals (curiosity, respect for the venue) \= higher points.

\---

\#\#\# Beat 2: Silver Floor (DJ – First Event Touch)

\*\*Opener:\*\*  
\> "Yo\! I'm the DJ. Every hour on the hour, the Dance Floor opens — it's free, it's packed, and it's where the magic happens. Wanna jump in?"

\*\*Mechanic:\*\* User must \*\*actually join a Dance Floor event\*\* (real token hold, real AI partners).

\*\*In-game result:\*\*  
\- If they join \+ stay 2 min: \+15 pts  
\- If they join \+ leave early: \+7 pts  
\- If they skip: \+2 pts (they can still progress)

\*\*Unlock hint:\*\* "You just earned tokens for joining. Spend 'em wisely."

\---

\#\#\# Beat 3: Gold Floor (Roxy – Gift Mechanic)

\*\*Opener:\*\*  
\> "I'm \*\*Roxy\*\*, the mixologist. On this floor, people send each other gifts to show interest. Want to try?"

\*\*Mechanic:\*\* User is given \*\*3 free tokens\*\* (temporary, story-only hold). They can:  
\- Buy a gift from the shop (costs 2 tokens)  
\- Send it to an AI character or another story participant

\*\*Scoring:\*\*  
\- Buys \+ sends a gift: \+20 pts  
\- Looks at gifts but doesn't send: \+10 pts  
\- Skips entirely: \+2 pts

\*\*Unlock hint:\*\* "Gifts unlock conversations. Remember that in the real Club."

\---

\#\#\# Beat 4: Plat/Diamond Gauntlet (Trixie \+ Valentina)

\*\*Opener:\*\*  
\> "I'm \*\*Trixie\*\*, the waitress on Platinum. You made it this far — most don't. Want to meet \*\*Valentina\*\* upstairs?"

\*\*Mechanic:\*\* A small \*\*choice tree\*\* (2–3 decision points) that flavors the dialogue but doesn't lock progression. Each choice signals user archetype (romantic, bold, cautious).

\*\*Scoring:\*\*  
\- Romantic choices \+ high engagement: \+25 pts  
\- Bold choices: \+20 pts  
\- Cautious/neutral: \+15 pts

\*\*Example choice:\*\*  
\> "Valentina says, 'Dance with me before we go to the roof.' Do you?"  
\> \- A) "Absolutely." → \+25 (romantic, engaging)  
\> \- B) "Let's get to it." → \+20 (direct)  
\> \- C) "I need a minute." → \+15 (cautious, but still progresses)

\---

\#\#\# Beat 5: Rooftop – Coat Check Finale

\*\*Opener (via Coat Check — pick your vault keeper):\*\*
\> You reach the top. The Coat Check is open — three women and three men, each ready to manage your vault. Pick the one who feels right.

\*\*Mechanic:\*\* \*\*No choices here — this is the payoff.\*\* A 3×2 selection grid appears: 3 Sasha variants (Blonde Thai, The Keeper, Black Hair Edgy) and 3 Jax variants (Default, The Vaultkeeper, Slicked Back). User picks one — that persona becomes their vault keeper. The other 5 stay unlockable on replays.

\- \*\*High score (70+):\*\* "You really understood this place. We'll have a lot to talk about."  
\- \*\*Medium score (50–69):\*\* "You've got the vibe. Let's get to know each other."  
\- \*\*Low score (\<50):\*\* "You're curious, at least. That's a start."

\*\*Outcome:\*\*  
\- Story marked complete  
\- User picks their vault keeper from 6 personas (3 Sasha, 3 Jax) — that persona is unlocked and becomes their Coat Check companion  
\- The other 5 personas stay available to unlock on future replays (collect them all\!)  
\- Tier badge awarded based on final score  
\- Prompted to explore the Lounge or real Club

\---

\#\# Scoring & Reward Tiers

\#\#\# Scoring Rules

\*\*Points per beat:\*\*  
\- Beat 1 (intro): 0–8 pts  
\- Beat 2 (event): 2–15 pts  
\- Beat 3 (gift): 2–20 pts  
\- Beat 4 (gauntlet): 15–25 pts  
\- Beat 5 (finale): 0 pts (narrative closure, no score)

\*\*Bonus points:\*\*  
\- Completed all optional tasks: \+5 pts  
\- Skipped no beats: \+10 pts (perfect run)

\*\*Max possible: 100 pts\*\*

\#\#\# Reward Tiers (One-Time Per User)

| Tier          | Score Threshold | Token Reward | Collectible          | Badge              | Notes                                         |
| ------------- | --------------- | ------------ | -------------------- | ------------------ | --------------------------------------------- |
| Silver        | 0–29            | 10           | `badge-apprentice`   | "The Apprentice"   | Completing the story earns this               |
| Gold          | 30–49           | 50           | `badge-dater`        | "The Dater"        | First real bonus                              |
| Platinum      | 50–69           | 100          | `badge-romantic`     | "The Romantic"     | Coat Check personas unlock here (pick 1 of 6) |
| Diamond       | 70–99           | 150          | `badge-dream-keeper` | "The Dream Keeper" | Max standard reward                           |
| Perfect Score | 100             | 250          | `badge-legend`       | "The Legend"       | Special bonus — only for flawless runs        |

\*\*Mechanics:\*\*
\- Rewards are claimed \*\*on completion\*\* (server-side, idempotent).
\- If user's score qualifies for Platinum but they already claimed Gold, they upgrade to Platinum and receive the delta (100 \- 50 \= \+50 tokens).
\- \*\*Coat Check Personas (6 variants):\*\* Unlock your first pick when you hit Platinum+ (50+ pts). The other 5 unlock on replays. All stay unlocked forever once claimed.
\- \*\*Perfect Score (100pts):\*\* Separate bonus tier. Even if Diamond was already claimed, a perfect run earns the Legend badge + 250 tokens. One-time only.
\- Replayability: Users can re-run the story to try for higher tiers. Only the highest unclaimed tier's tokens are credited (no double-dipping).

\---

\#\# API Routes & Endpoints

\#\#\# Story Routes

| Route                             | Method | Purpose                                                      | Auth                  |
| --------------------------------- | ------ | ------------------------------------------------------------ | --------------------- |
| \`/api/story/start\`              | POST   | Initialize story progress for user                           | Verified user         |
| \`/api/story/beat/:beat\_number\` | POST   | Submit beat completion \+ choices                            | Verified user         |
| \`/api/story/complete\`           | POST   | Mark story as complete, calculate final score, award rewards | Verified user         |
| \`/api/story/progress\`           | GET    | Fetch current story state (for resuming)                     | Verified user         |
| \`/api/story/reset\`              | POST   | Reset story for a fresh run (admin only or opt-in)           | Verified user \+ flag |

\#\#\# Client Routes (Next.js Pages)

| Route                      | Component         | Purpose                                                                    |
| -------------------------- | ----------------- | -------------------------------------------------------------------------- |
| \`/story\`                 | \`StoryMode\`     | Story container (full-screen mobile experience)                            |
| \`/story/beat/\[number\]\` | \`StoryBeat\`     | Individual beat UI (optional: could be a single page with dynamic content) |
| \`/story/complete\`        | \`StoryComplete\` | Completion screen (score, rewards, Coat Check unlock)                      |

\---

\#\# Implementation Phases

\#\#\# Phase 1: Database & API Foundation  
\- \[ \] Create migrations: \`user\_story\_progress\`, \`story\_beat\_completion\`, \`collectibles\` seed  
\- \[ \] Write RLS policies  
\- \[ \] Implement \`/api/story/\*\` endpoints  
\- \[ \] Add server-side validation: score calculation, reward idempotency  
\- \[ \] Add token crediting to the main ledger (use existing token engine)

\#\#\# Phase 2: Frontend & UI  
\- \[ \] Create mobile-first UI for story beats  
\- \[ \] Build beat components (dialogue, choices, event integration)  
\- \[ \] Add progress bar / visual floor navigation  
\- \[ \] Build completion screen with rewards display  
\- \[ \] Link Coat Check vault keepers (6 personas) to chat system

\#\#\# Phase 3: AI & Dialogue  
\- \[ \] Write beat prompts (5 main \+ variants for choices)  
\- \[ \] Update \`characters\` table with Coat Check AI definition  
\- \[ \] Test AI dialogue generation (DeepSeek integration)  
\- \[ \] Validate dialogue variability across runs (seed different context each time)

\#\#\# Phase 4: Event Integration  
\- \[ \] Hook Beat 2 to real Dance Floor event (token hold, AI participants)  
\- \[ \] Hook Beat 3 to gift shop (temporary token allocation, gift send)  
\- \[ \] Add story-mode badge/context to events (show "story mode" vs normal)  
\- \[ \] Ensure event results (pass/fail) flow back to story score

\#\#\# Phase 5: QA & Polish  
\- \[ \] Test full user flow (signup → story → completion → Lounge)  
\- \[ \] Stress test: concurrent story starts, reward claim idempotency  
\- \[ \] Mobile layout validation (iPhone / Android)  
\- \[ \] Proofreading & copy refinement  
\- \[ \] Analytics: track drop-off points, avg score, replay rate

\---

\#\# Technical Considerations

\#\#\# Token Handling

\- Story gives \*\*temporary token holds\*\* (don't charge user balance until beat completion).  
\- On beat completion, holds become permanent ledger entries (server-side only).  
\- Max holds per story run: \~15 tokens (safe guard against ledger overflow).  
\- If user abandons mid-story, holds are released (cron cleanup or manual session timeout).

\#\#\# AI Cost

\- 5 beats × \~3 API calls per beat (beat intro \+ 1–2 dialogue exchanges) \= \~15 calls per full run.  
\- At DeepSeek rates (\~$0.0002 per 1K tokens), cost ≈ $0.003–$0.01 per story run.  
\- Budget: expect \~1K runs/month initially. Monitor and adjust prompt length if costs exceed $30/month.

\#\#\# Event Integration

\- Story-mode Dance Floor event is identical to normal events, but:  
\- Only AI participants (no real humans in story runs).  
\- Story context added to event object (\`is\_story\_mode: true\`).  
\- Results fed back to story score (via webhook or direct API call).

\#\#\# Coat Check Personas — 6 Vault Keepers

\- All 6 unlock on first Platinum+ completion (50+ pts). \*\*User picks one to unlock first.\*\*
\- \*\*3 Sasha variants:\*\* Blonde Thai (warm, radiant), The Keeper (chic, magnetic), Black Hair Edgy (bold, confident)
\- \*\*3 Jax variants:\*\* Default (smooth, relaxed), The Vaultkeeper (charismatic heartthrob), Slicked Back (sharp-dressed, confident)
\- The other 5 stay available to unlock on replays. All 6 can be collected.
\- Once unlocked, a persona stays unlocked — replaying below Platinum doesn't revoke it.

\#\#\# Replayability & Analytics

\- Track \`total\_runs\` and \`last\_tier\_earned\` per user.  
\- Flag users who replay frequently (e.g., \>3 times) — might indicate engagement with the feature or frustration.  
\- Log beat drop-offs: if 60% quit at Beat 4, revisit difficulty/pacing.

\---

\#\# Validation Checklist (Before Merge)

\- \[ \] Database migration applies cleanly (no RLS conflicts)  
\- \[ \] \`/api/story/complete\` is idempotent (same score, same reward, called twice \= no double-credit)  
\- \[ \] Token ledger is never written directly from the client  
\- \[ \] Story beats render on mobile without horizontal scroll  
\- \[ \] AI dialogue is unique across two consecutive runs (test with same user)  
\- \[ \] Event integration: Beat 2 Dance Floor hold \+ release works correctly  
\- \[ \] All 6 Coat Check personas load and are selectable on completion (3×2 grid)  
\- \[ \] Collectible badge displays in profile & Lounge  
\- \[ \] Reward tier boundaries tested: score 29 (Silver), 30 (Gold), 50 (Platinum), 70 (Diamond), 100 (Perfect)  
\- \[ \] \`pnpm lint\` \+ \`pnpm test\` \+ \`pnpm build\` all pass  
\- \[ \] PRD updated with Story Mode feature summary

\---

\#\# Future Enhancements (Out of Scope, Phase 6+)

\- Branching narrative paths (e.g., "find the dream date" vs "win an event competition")  
\- Leaderboard: highest story scores  
\- Story achievements (e.g., "Speed Dating expert" for beating Beat 4 in \<2 min)  
\- Seasonal story variants (Halloween theme, holiday specials)  
\- Accessibility: screen reader support for dialogue, keyboard navigation

\---

\#\# Questions to Resolve Before Coding

1\. \*\*Coat Check AI persona definition:\*\* Is this character already partially defined, or do we build from scratch?  
2\. \*\*Event pacing:\*\* Should Beat 2 be skippable, or is Dance Floor participation mandatory?  
3\. \*\*Mobile navigation:\*\* Do we use a full-screen overlay or dedicated \`/story/\*\` pages?  
4\. \*\*Replay gate:\*\* Should story resets be instant or have a cooldown (e.g., "come back in 24 hours for a fresh story")?  
5\. \*\*Hints/help:\*\* If a user gets stuck, is there a hint system or AI assistant to guide them?

\---

\#\# Docs & References

\- \*\*PRD Foundation:\*\* \`docs/PRD-foundation.md\`  
\- \*\*Game Engines:\*\* \`docs/GAME-ENGINES.md\`  
\- \*\*Floors Map:\*\* \`docs/floor-map.md\`  
\- \*\*Characters:\*\* \`utils/characters.ts\`  
\- \*\*Events Config:\*\* \`utils/events-config.ts\`  
\- \*\*Token Engine:\*\* \`utils/token-amount.ts\` \+ \`/api/webhooks/stripe\`

\`\`\`

\---

This blueprint is \*\*locked in, ready to copy to your docs\*\*, and covers every angle: database schema, API design, mobile-first UX, scoring mechanics, reward tiers (with one-time idempotency), AI integration, event hooks, and a clear phase breakdown.

Print this, paste it into \`docs/STORY-MODE-BLUEPRINT.md\`, and reference it during development. The validation checklist at the end is your merge gate — nothing goes live without it.

\*\*Ready to start Phase 1, or do you want to lock in any of those "Questions to Resolve" first?\*\*
