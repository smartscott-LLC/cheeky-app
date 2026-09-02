import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { STORY_BEATS, getTierForScore } from './beats';

/**
 * Get the current story progress for the signed-in user.
 * Returns null if no story has been started.
 */
export async function getStoryProgress() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return null;

  const { data } = await supabase
    .from('user_story_progress')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return data;
}

/**
 * Start a new story run for the user. Returns the first beat.
 */
export async function startStory() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return null;

  // Check if there's an existing incomplete run
  const existing = await getStoryProgress();
  if (existing && !existing.is_complete) {
    return existing;
  }

  // If complete and restarting, increment run count
  if (existing?.is_complete) {
    const { data } = await supabase
      .from('user_story_progress')
      .update({
        current_beat: 1,
        is_complete: false,
        completion_date: null,
        final_score: null,
        choices_made: {},
        current_score: 0,
        total_runs: (existing.total_runs ?? 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    return data;
  }

  // Fresh start
  const { data } = await supabase
    .from('user_story_progress')
    .insert({
      user_id: user.id,
      current_beat: 1,
      current_score: 0,
      choices_made: {},
      total_runs: 1
    })
    .select()
    .single();

  return data;
}

/**
 * Record a beat completion and advance to the next beat.
 * Returns the updated progress.
 */
export async function completeBeat(beatNumber: number, choiceId: string) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return null;

  const beat = STORY_BEATS.find((b) => b.number === beatNumber);
  if (!beat) return null;

  const choice = beat.choices.find((c) => c.id === choiceId);
  if (!choice) return null;

  const progress = await getStoryProgress();
  if (!progress) return null;

  // Record the beat completion
  await supabase.from('story_beat_completion').insert({
    user_id: user.id,
    run_number: progress.total_runs ?? 1,
    beat_number: beatNumber,
    choice_made: choiceId,
    score_earned: choice.score
  });

  const newScore = (progress.current_score ?? 0) + choice.score;
  const choicesMade = {
    ...(progress.choices_made as Record<string, string>),
    [`beat_${beatNumber}`]: choiceId
  };

  // If this was the last beat, mark complete
  if (beatNumber >= 5) {
    const tier = getTierForScore(newScore);
    const { data } = await supabase
      .from('user_story_progress')
      .update({
        current_beat: 6,
        is_complete: true,
        completion_date: new Date().toISOString(),
        final_score: newScore,
        current_score: newScore,
        choices_made: choicesMade,
        last_tier_earned: tier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    return data;
  }

  // Advance to next beat
  const { data } = await supabase
    .from('user_story_progress')
    .update({
      current_beat: beatNumber + 1,
      current_score: newScore,
      choices_made: choicesMade,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .select()
    .single();

  return data;
}

/**
 * Select a Coat Check persona after story completion.
 */
export async function selectPersona(personaSlug: string) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return null;

  const progress = await getStoryProgress();
  if (!progress?.is_complete) return null;

  // Update the selected persona
  const { data } = await supabase
    .from('user_story_progress')
    .update({
      selected_persona: personaSlug,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .select()
    .single();

  return data;
}

/**
 * Check if the user has completed the story and should be redirected.
 */
export async function shouldRedirectToStory(): Promise<string | null> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return null;

  // Only redirect verified users who haven't started or completed the story
  const { data: profile } = await supabase
    .from('profiles')
    .select('verified_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.verified_at) return null;

  const progress = await getStoryProgress();
  if (!progress) return '/story'; // verified but never started
  if (progress.is_complete && !progress.selected_persona) return '/story?persona=1'; // completed but no persona chosen

  return null;
}