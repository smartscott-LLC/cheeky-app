'use client';

import { useState } from 'react';
import Link from 'next/link';

interface StoryNudgeProps {
  hasProgress?: boolean;
  isComplete?: boolean;
}

/**
 * Story Mode Nudge — shown on the lobby for verified members who haven't
 * completed the story onboarding. Points them to Coat Check where the
 * story mode lives (it's the onboarding experience).
 */
export default function StoryNudge({
  hasProgress = false,
  isComplete = false
}: StoryNudgeProps) {
  // Initialize from localStorage to avoid flash of non-dismissed nudge
  let initiallyDismissed = false;
  if (typeof window !== 'undefined') {
    try {
      initiallyDismissed =
        localStorage.getItem('tiki:story-nudge') === 'dismissed';
    } catch {
      /* ignore */
    }
  }
  const [dismissed, setDismissed] = useState(initiallyDismissed);

  if (dismissed || hasProgress) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('tiki:story-nudge', 'dismissed');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative mb-6 rounded-2xl border border-gold/40 bg-zinc-900/80 p-5 shadow-[0_0_30px_rgba(255,215,0,0.1)]">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 rounded p-1 text-zinc-500 transition hover:text-zinc-300"
        title="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-2xl">
          🧥
        </div>
        <div className="flex-1">
          <h3 className="font-hero text-gold text-lg">
            {isComplete ? 'Choose your persona' : 'Start your story'}
          </h3>
          <p className="mt-1 font-body text-club text-sm">
            {isComplete
              ? 'You completed the story — now pick your Coat Check guardian. This is your permanent persona for the club.'
              : 'Your journey into the club starts here. Meet the crew, learn the rules, and earn your place — it only takes a few minutes.'}
          </p>
          <Link
            href="/story"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black transition hover:bg-gold/80"
          >
            {isComplete ? 'Pick your persona' : 'Begin the story →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
