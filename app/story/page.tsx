import StoryPlayer from '@/components/ui/Story/StoryPlayer';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function StoryPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const { persona } = await searchParams;

  // Fetch story progress
  const { data: progress } = await supabase
    .from('user_story_progress')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // If the user has completed the story and chosen a persona, send them to the club
  if (progress?.is_complete && progress?.selected_persona && !persona) {
    return redirect('/club');
  }

  // If no progress exists, show the intro screen
  if (!progress) {
    return (
      <div className="bg-black">
        <div className="mx-auto flex min-h-[80dvh] max-w-2xl flex-col items-center justify-center px-6 text-center">
          <p className="text-6xl">🌆</p>
          <h1 className="font-hero text-gold mt-6 text-4xl sm:text-5xl">
            The Chase to the Coat Check
          </h1>
          <p className="text-club mx-auto mt-4 max-w-lg leading-relaxed">
            You&apos;ve got your Silver card. The club is open. But the real
            night hasn&apos;t started yet.
          </p>
          <p className="text-club mt-4 max-w-lg leading-relaxed">
            Five floors. Five characters. One question — who will you be
            when you reach the top?
          </p>

          <div className="mt-8 space-y-3 text-left">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="font-header text-cyan text-sm">🎭 Meet the Crew</p>
              <p className="text-club mt-1 text-sm">
                Brutus at the door, D34D_B34T on the decks, Roxy behind the
                bar, Trixie working the room, Valentina at the top.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="font-header text-cyan text-sm">🎯 Make Choices</p>
              <p className="text-club mt-1 text-sm">
                Every choice shapes your story and your score. Higher score
                means better rewards.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="font-header text-cyan text-sm">🧥 Unlock the Coat Check</p>
              <p className="text-club mt-1 text-sm">
                Reach the rooftop and choose your persona — your vault keeper
                for everything you collect.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <form action="/api/story/start" method="POST">
              <button
                type="submit"
                className="rounded-lg bg-club px-10 py-4 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
              >
                Start the Chase
              </button>
            </form>
            <Link
              href="/club"
              className="rounded-lg border border-zinc-700 px-8 py-4 font-semibold text-club transition hover:border-zinc-500 hover:text-white"
            >
              Skip — go to the club
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show the story player
  return (
    <StoryPlayer
      initialBeat={progress.current_beat ?? 1}
      initialScore={progress.current_score ?? 0}
      isComplete={progress.is_complete ?? false}
      selectedPersona={progress.selected_persona}
    />
  );
}