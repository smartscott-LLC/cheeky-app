'use client';

import { useState } from 'react';
import { likeUser, waveAt } from '@/app/browse/actions';
import { openConversation } from '@/app/messages/actions';
import posthog from 'posthog-js';

export interface BrowsePerson {
  id: string;
  display_name: string | null;
  bio: string | null;
  one_liner?: string | null;
  verified_at: string | null;
  photos: { storage_path: string | null; is_primary: boolean | null }[];
}

interface BrowseCardProps {
  people: BrowsePerson[];
  photoBase: string;
  wavedIds?: string[];
}

export default function BrowseCard({
  people,
  photoBase,
  wavedIds = []
}: BrowseCardProps) {
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<BrowsePerson | null>(null);
  const [busy, setBusy] = useState(false);
  const [waved, setWaved] = useState<Set<string>>(new Set(wavedIds));
  const [waveBusy, setWaveBusy] = useState(false);

  const person = people[index];

  if (matched) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-club/60 bg-zinc-900/80 p-10 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
          The floor just cleared for you two
        </p>
        <h2 className="mt-4 text-4xl font-extrabold">It&apos;s a match!</h2>
        <p className="mt-3 text-cyan">
          You and{' '}
          <span className="font-bold text-white">
            {matched.display_name || 'your match'}
          </span>{' '}
          picked each other. Instant.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => openConversation(matched.id)}
            className="rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton"
          >
            Start chatting
          </button>
          <button
            onClick={() => {
              setMatched(null);
              setIndex((i) => i + 1);
            }}
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-cyan transition hover:border-zinc-500 hover:text-white"
          >
            Keep browsing
          </button>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
        <h2 className="text-2xl font-extrabold">You&apos;ve seen the room.</h2>
        <p className="mt-3 text-cyan">
          Everyone&apos;s been shown. Check back when the club&apos;s busier —
          new faces land here.
        </p>
      </div>
    );
  }

  const photo = person.photos.find((p) => p.is_primary) ?? person.photos[0];

  const handleWave = async () => {
    if (waved.has(person.id) || waveBusy) return;
    setWaveBusy(true);
    const res = await waveAt(person.id);
    setWaveBusy(false);
    if (res.error) return;
    setWaved((s) => new Set(s).add(person.id));
    posthog.capture('member_waved_at');
  };

  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex aspect-[4/3] items-center justify-center bg-zinc-800">
        {photo?.storage_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${photoBase}${photo.storage_path}`}
            alt={person.display_name || 'Member'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-6xl font-extrabold text-cyan">
            {(person.display_name || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-extrabold">
            {person.display_name || 'New member'}
          </h3>
          {person.verified_at && (
            <span className="rounded-full bg-club/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-club">
              Verified
            </span>
          )}
        </div>
        <p className="mt-2 text-cyan">
          {person.one_liner || person.bio || 'Just got through the door.'}
        </p>
      </div>
      <div className="flex gap-3 p-6 pt-0">
        <button
          onClick={() => openConversation(person.id)}
          className="rounded-lg border border-zinc-700 px-3 py-3 text-sm font-semibold text-cyan transition hover:border-zinc-500 hover:text-white"
        >
          Message
        </button>
        <button
          onClick={handleWave}
          disabled={waved.has(person.id) || waveBusy}
          title={waved.has(person.id) ? 'You waved at them' : 'Send a wave'}
          className={`rounded-lg px-3 py-3 text-sm font-bold transition ${
            waved.has(person.id)
              ? 'bg-platinum/15 text-platinum'
              : 'border border-zinc-700 text-cyan hover:border-platinum hover:text-platinum'
          }`}
        >
          {waved.has(person.id) ? 'Waved ✓' : '👋'}
        </button>
        <button
          onClick={() => setIndex((i) => i + 1)}
          disabled={busy}
          className="flex-1 rounded-lg border border-zinc-700 px-4 py-3 font-semibold text-cyan transition hover:border-zinc-500 hover:text-white"
        >
          Pass
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            const result = await likeUser(person.id);
            setBusy(false);
            if (result.error) return;
            posthog.capture('member_liked', {
              resulted_in_match: result.matched
            });
            if (result.matched) {
              setMatched(person);
            } else {
              setIndex((i) => i + 1);
            }
          }}
          disabled={busy}
          className="flex-1 rounded-lg bg-club px-4 py-3 font-bold text-white transition hover:bg-club-cotton"
        >
          {busy ? 'Checking…' : 'Like'}
        </button>
      </div>
    </div>
  );
}
