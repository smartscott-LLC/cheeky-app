# Club Cheeky Story Mode Implementation Blueprint

**Feature:** The Chase to the Coat Check — An Interactive Story RPG  
**Status:** Development roadmap  
**Last updated:** 2026-08-31

---

## Overview

A guided, narrative adventure that onboards new verified users through the Club floors while teaching app mechanics, rewarding engagement with tokens and exclusive collectibles, and introducing the Coat Check AI persona (unlocked on completion). Users can replay the story to improve their score and unlock higher-tier prizes.

**Core pillars:**
- ✅ Mobile-first narrative (short, punchy dialogue + inline choices)
- ✅ Prize system: Silver (baseline) → Gold → Platinum → Diamond (one-time reward per tier, per user)
- ✅ Replayable: different AI dialogue each run; users retry to earn Diamond-tier rewards
- ✅ Incentive: +50 bonus tokens on first story completion (separate from 25 startup tokens)
- ✅ Integrates existing systems: real events, real token holds, real chat rooms

---

## User Flow (Mobile-First)

### Entry

1. User verifies ID → Silver card + 25 tokens → redirected to `/club` (lobby)
2. Onboarding prompt: "Meet your dream date — find them through the Club"
3. CTA: "Start the Chase" → enters story mode at `/story` (outside the club)
4. **Progress state:** `user_story_progress` table tracks beats, choices, score, rewards

### Story Beats (5 beats)

| Beat | Location | Duration | Mechanics | AI/Event Role | Learning Goal |
|------|----------|----------|-----------|---------------|---------------|
| **1: The Street** | Outside the club | ~2 min | Intro dialogue + 1 choice | Chaz or Brutus greets | "Here's what the Club is" |
| **2: Silver Floor** | The Lobby/Dance Floor | ~3 min | Meet crew member + event participation | DJ (D34D_B34T) or crew | "How tokens + events work" |
| **3: Gold Floor** | Gold floor room | ~3 min | Dialogue choices + gift mechanic intro | Roxy (mixologist) | "Gifts show interest; buy with tokens" |
| **4: Plat/Diamond Gauntlet** | Platinum & Diamond floors | ~4 min | Speed mini-game or decision tree | Trixie + Valentina | "The higher floors reveal more" |
| **5: Rooftop Finale** | Coat Check / Rooftop | ~3 min | Meet the Coat Check AI + final choice | Coat Check AI (new persona) | "The dream date is here; you unlock this" |

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
  reward_tiers_claimed JSONB DEFAULT '{}'::jsonb, -- { "silver": true, "gold": true, ... }
  last_tier_earned TEXT,                 -- 'silver', 'gold', 'platinum', 'diamond'
  
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