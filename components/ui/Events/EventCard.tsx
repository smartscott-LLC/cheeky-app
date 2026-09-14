'use client';

import { useState } from 'react';
import Link from 'next/link';
import { joinEvent } from '@/app/events/actions';
import { eventUrl } from '@/utils/events';

interface EventCardProps {
  kind: string;
  meta: {
    name: string;
    floor: string;
    rank: number;
    icon: string;
    emoji: string;
    tagline: string;
    accent: string;
    image: string;
    gradient: string;
    cta: string;
  };
  locked: boolean;
  nextEvent: {
    id: string;
    starts_at: string;
    token_cost: number;
    status: string;
  } | null;
  eventId?: string;
}

/**
 * A single event card used on the Event Center page.
 * For Speed Dating (and other clock-driven rooms), renders a Join button
 * when the event is open so members can enter without leaving the page.
 */
export default function EventCard({
  kind,
  meta,
  locked,
  nextEvent,
  eventId
}: EventCardProps) {
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSpeedDating = kind === 'speed_dating';

  const handleJoin = async () => {
    if (!eventId || busy || joined) return;
    setBusy(true);
    const res = await joinEvent(eventId);
    setBusy(false);
    if (res.error) {
      setError(
        res.error === 'insufficient_tokens'
          ? 'Not enough tokens. Top up or earn some.'
          : 'Could not join — try again.'
      );
      return;
    }
    setJoined(true);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-zinc-900/50 ${
        locked ? 'border-zinc-800' : 'border-zinc-700'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.image}
        alt={meta.name}
        className="h-28 w-full object-cover"
      />
      <div className={`h-1 w-full bg-gradient-to-r ${meta.gradient}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.icon}
              alt={meta.name}
              className="h-8 w-8 object-contain"
            />
            <h3 className="font-header text-cyan text-xl">{meta.name}</h3>
          </div>
          <span
            className={`text-sm font-bold uppercase tracking-wide ${
              meta.accent.split(' ')[0]
            }`}
          >
            {meta.floor}
          </span>
        </div>
        <p className="font-body text-club mt-1 text-sm">
          {nextEvent
            ? `${new Date(nextEvent.starts_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
              })} · ${nextEvent.token_cost} tokens`
            : 'Between sets'}
        </p>
        <p className="font-body text-club mt-2 text-sm">{meta.tagline}</p>
        {locked ? (
          <p className="font-body text-club mt-4 text-base font-bold">
            Behind the rope. Come see what&apos;s on these floors with a{' '}
            {meta.floor} card today.
          </p>
        ) : isSpeedDating && nextEvent ? (
          <>
            <button
              onClick={handleJoin}
              disabled={busy || joined || nextEvent.status !== 'open'}
              className={`mt-4 flex w-full items-center justify-center rounded-lg px-4 py-2 text-center text-base font-bold transition ${
                joined
                  ? 'bg-emerald-600 text-white'
                  : nextEvent.status === 'open'
                    ? 'bg-club text-white hover:bg-club-cotton'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              } disabled:cursor-not-allowed`}
            >
              {busy
                ? 'Checking…'
                : joined
                  ? '✓ Joined'
                  : nextEvent.status === 'open'
                    ? `Join for ${nextEvent.token_cost} tokens`
                    : 'The room'}
            </button>
            {error && (
              <p className="mt-2 text-xs font-body text-red-400">{error}</p>
            )}
          </>
        ) : (
          <Link
            href={eventUrl(kind)}
            className={`mt-4 inline-block w-full rounded-lg px-4 py-2 text-center text-base font-bold transition ${meta.cta}`}
          >
            {nextEvent ? 'Enter the room →' : 'The room'}
          </Link>
        )}
      </div>
    </div>
  );
}
