-- Story Mode: The Chase to the Coat Check
-- Tracks user progress through the 5-beat narrative RPG onboarding.
--
-- Two tables:
--   user_story_progress — one row per user, tracks overall run state
--   story_beat_completion — one row per beat per run, tracks choices + scores

-- ============================================================
-- Table: user_story_progress
-- ============================================================
CREATE TABLE user_story_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,

  -- Current run
  current_beat INT DEFAULT 0,             -- 0 = before start, 1–5 = beat number, 5+ = complete
  choices_made JSONB DEFAULT '{}'::jsonb, -- { "beat_1": "choice_A", "beat_3": "choice_B" }
  current_score INT DEFAULT 0,

  -- Completion & rewards
  is_complete BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMP WITH TIME ZONE,
  final_score INT,

  -- Reward tracking (one-time per tier, per user)
  reward_tiers_claimed JSONB DEFAULT '{}'::jsonb, -- { "silver": true, "gold": true, ... }
  last_tier_earned TEXT,                    -- 'silver', 'gold', 'platinum', 'diamond'

  -- Persona selection
  selected_persona TEXT,                    -- slug of the chosen Coat Check persona

  -- Metadata
  total_runs INT DEFAULT 1,                -- increments if user restarts after completion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_story_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_read_their_story_progress"
  ON user_story_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_their_story_progress"
  ON user_story_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_their_story_progress"
  ON user_story_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Table: story_beat_completion
-- ============================================================
CREATE TABLE story_beat_completion (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  run_number INT NOT NULL DEFAULT 1,       -- which run this beat belongs to
  beat_number INT NOT NULL,                -- 1–5
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  choice_made TEXT,                        -- the choice the user picked at this beat
  score_earned INT DEFAULT 0               -- points from this beat
);

ALTER TABLE story_beat_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_read_their_beat_completions"
  ON story_beat_completion FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_their_beat_completions"
  ON story_beat_completion FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: The Coat Check persona unlock is tracked via
-- user_story_progress.selected_persona + character_relations.
-- No separate collectibles table exists — gems use gem_catalog,
-- badges use badge_catalog. The persona is a character bond.