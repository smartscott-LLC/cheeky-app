'use client';

import { useState, useCallback } from 'react';
import { STORY_BEATS, type StoryBeat, PERSONAS, getTierForScore } from '@/utils/story/beats';

interface StoryPlayerProps {
  initialBeat: number;
  initialScore: number;
  isComplete: boolean;
  selectedPersona: string | null;
}

export default function StoryPlayer({
  initialBeat,
  initialScore,
  isComplete,
  selectedPersona
}: StoryPlayerProps) {
  const [currentBeat, setCurrentBeat] = useState(initialBeat);
  const [score, setScore] = useState(initialScore);
  const [finished, setFinished] = useState(isComplete);
  const [chosenPersona, setChosenPersona] = useState(selectedPersona);
  const [showResponse, setShowResponse] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPersonaSelect, setShowPersonaSelect] = useState(
    isComplete && !selectedPersona
  );

  const beat: StoryBeat | undefined = STORY_BEATS.find(
    (b) => b.number === currentBeat
  );

  const handleChoice = useCallback(
    async (choiceId: string) => {
      if (busy || !beat) return;
      setBusy(true);

      const choice = beat.choices.find((c) => c.id === choiceId);
      if (!choice) return;

      setLastResponse(choice.response);
      setShowResponse(true);

      try {
        const res = await fetch('/api/story/beat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beatNumber: beat.number,
            choiceId
          })
        });

        const data = await res.json();

        if (data.complete) {
          setScore(data.score);
          setFinished(true);
          setShowPersonaSelect(true);
        } else {
          setScore(data.score);
        }
      } catch {
        // Still advance locally if the API call fails
        if (beat.number >= 5) {
          setScore(score + choice.score);
          setFinished(true);
          setShowPersonaSelect(true);
        } else {
          setScore(score + choice.score);
        }
      }

      setBusy(false);
    },
    [beat, busy, score]
  );

  const handleNextBeat = useCallback(() => {
    setShowResponse(false);
    if (beat && currentBeat < 5) {
      setCurrentBeat(currentBeat + 1);
    }
  }, [beat, currentBeat]);

  const handlePersonaSelect = useCallback(
    async (personaSlug: string) => {
      setBusy(true);
      try {
        await fetch('/api/story/persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaSlug })
        });
      } catch {
        // Continue even if API fails
      }
      setChosenPersona(personaSlug);
      setShowPersonaSelect(false);
      setBusy(false);
    },
    []
  );

  // ── Persona Selection Screen ──────────────────────────────────
  if (showPersonaSelect) {
    const tier = getTierForScore(score);
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

    return (
      <div className="bg-black">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="text-5xl">🧥</p>
          <h1 className="font-hero text-gold mt-6 text-4xl sm:text-5xl">
            Choose Your Keeper
          </h1>
          <p className="font-body text-club mx-auto mt-3 max-w-xl">
            You&apos;ve climbed every floor. The Coat Check is yours.
            Pick the persona who will keep your vault — your collectibles,
            your memories, your story.
          </p>

          <div className="mt-4 inline-block rounded-full border border-club/40 bg-zinc-900/70 px-5 py-2">
            <span className="font-header text-cyan text-lg">
              Final score: {score} — {tierLabel} tier
            </span>
          </div>

          {/* Female column */}
          <div className="mt-10">
            <h2 className="font-header text-cyan text-xl">Sasha</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PERSONAS.filter((p) => p.gender === 'female').map((p) => (
                <button
                  key={p.slug}
                  onClick={() => handlePersonaSelect(p.slug)}
                  disabled={busy}
                  className={`group rounded-2xl border p-4 text-center transition ${
                    chosenPersona === p.slug
                      ? 'border-club bg-club/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-club/60 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="mx-auto h-32 w-24 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagePath}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <p className="font-body text-club mt-3 font-bold">{p.name}</p>
                  <p className="font-body text-club text-sm">{p.variant}</p>
                  <p className="font-body text-club mt-1 text-[13px]">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Male column */}
          <div className="mt-8">
            <h2 className="font-header text-cyan text-xl">Jax</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PERSONAS.filter((p) => p.gender === 'male').map((p) => (
                <button
                  key={p.slug}
                  onClick={() => handlePersonaSelect(p.slug)}
                  disabled={busy}
                  className={`group rounded-2xl border p-4 text-center transition ${
                    chosenPersona === p.slug
                      ? 'border-club bg-club/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-club/60 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="mx-auto h-32 w-24 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagePath}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <p className="font-body text-club mt-3 font-bold">{p.name}</p>
                  <p className="font-body text-club text-sm">{p.variant}</p>
                  <p className="font-body text-club mt-1 text-[13px]">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {chosenPersona && (
            <div className="mt-10">
              <a
                href="/club"
                className="inline-block rounded-lg bg-club px-10 py-4 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
              >
                Enter the Club →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Completion Screen ─────────────────────────────────────────
  if (finished) {
    const tier = getTierForScore(score);
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-6xl">✨</p>
          <h1 className="font-hero text-gold mt-6 text-4xl sm:text-5xl">
            You Made It
          </h1>
          <p className="font-body text-club mx-auto mt-4 max-w-lg">
            You&apos;ve climbed every floor, met the crew, and reached the
            Coat Check. The club is yours.
          </p>

          <div className="mx-auto mt-8 inline-block rounded-2xl border border-club/40 bg-zinc-900/70 px-8 py-6">
            <p className="font-header text-cyan text-lg">Final Score</p>
            <p className="font-hero text-gold mt-2 text-5xl">{score}</p>
            <p className="font-body text-club mt-2 text-base uppercase tracking-[0.15em]">
              {tierLabel} tier
            </p>
          </div>

          <p className="font-body text-club mx-auto mt-6 max-w-md text-sm">
            {tier === 'diamond'
              ? 'Perfect run. You left nothing on the floor.'
              : tier === 'platinum'
                ? 'Almost flawless. Try again for Diamond — every choice counts.'
                : tier === 'gold'
                  ? 'Solid run. A few bolder choices and you could hit Platinum.'
                  : 'Good start. The story rewards curiosity — try different choices next time.'}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => {
                setCurrentBeat(1);
                setScore(0);
                setFinished(false);
                setShowResponse(false);
                setLastResponse('');
              }}
              className="rounded-lg border border-zinc-700 px-8 py-3 font-semibold font-body text-club transition hover:border-zinc-500 hover:text-white"
            >
              Play Again
            </button>
            <a
              href="/club"
              className="rounded-lg bg-club px-8 py-3 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              Enter the Club →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Beat Display ──────────────────────────────────────────────
  if (!beat) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="font-body text-club text-5xl">🤔</p>
          <h1 className="font-hero text-gold mt-6 text-4xl">
            Story not found
          </h1>
          <p className="font-body text-club mx-auto mt-3 max-w-md">
            Something went wrong. Try starting over.
          </p>
          <a
            href="/story"
            className="mt-8 inline-block rounded-lg border border-zinc-700 px-8 py-3 font-semibold font-body text-club transition hover:border-zinc-500 hover:text-white"
          >
            Start Over
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition ${
                n <= currentBeat ? 'bg-club' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Beat header */}
        <div className="mb-2 flex items-center justify-between">
          <span className="font-header text-cyan text-sm uppercase tracking-[0.15em]">
            Beat {beat.number} of 5
          </span>
          <span className="font-body text-club text-sm">
            Score: {score}
          </span>
        </div>

        <h1 className="font-hero text-gold text-3xl sm:text-4xl">
          {beat.title}
        </h1>
        <p className="font-body text-club mt-1 text-sm">{beat.location}</p>

        {/* Scene narrative */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="font-body text-club leading-relaxed">{beat.narrative}</p>
        </div>

        {/* Character dialogue */}
        <div className="mt-6 rounded-2xl border border-club/30 bg-zinc-900/70 p-6">
          <p className="font-header text-cyan text-sm uppercase tracking-[0.1em]">
            {beat.characterName}
          </p>
          <p className="font-body text-club mt-3 leading-relaxed">{beat.dialogue}</p>
        </div>

        {/* Response after choice */}
        {showResponse && lastResponse && (
          <div className="mt-6 rounded-2xl border border-club/40 bg-club/5 p-6">
            <p className="font-header text-cyan text-sm uppercase tracking-[0.1em]">
              {beat.characterName} responds
            </p>
            <p className="font-body text-club mt-3 leading-relaxed">{lastResponse}</p>
            {currentBeat < 5 && (
              <button
                onClick={handleNextBeat}
                className="mt-4 rounded-lg bg-club px-6 py-2 font-bold text-white transition hover:bg-club-cotton"
              >
                Continue →
              </button>
            )}
            {currentBeat >= 5 && (
              <button
                onClick={handleNextBeat}
                className="mt-4 rounded-lg bg-club px-6 py-2 font-bold text-white transition hover:bg-club-cotton"
              >
                See Your Results →
              </button>
            )}
          </div>
        )}

        {/* Choices */}
        {!showResponse && (
          <div className="mt-8 space-y-3">
            <p className="font-header text-cyan text-sm uppercase tracking-[0.1em]">
              What do you do?
            </p>
            {beat.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice.id)}
                disabled={busy}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-left transition hover:border-club/60 hover:bg-zinc-900/80 disabled:opacity-50"
              >
                <span className="font-body text-club font-semibold">{choice.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Learning goal (subtle) */}
        <p className="font-body text-club mt-8 text-center text-xs opacity-50">
          💡 {beat.learningGoal}
        </p>
      </div>
    </div>
  );
}
