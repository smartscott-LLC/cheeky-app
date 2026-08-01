'use client';

import { useState } from 'react';
import { likeUser } from '@/app/browse/actions';

export interface BrowsePerson {
  id: string;
  display_name: string | null;
  bio: string | null;
  verified_at: string | null;
  photos: { storage_path: string | null; is_primary: boolean | null }[];
}

interface BrowseCardProps {
  people: BrowsePerson[];
  photoBase: string;
}

export default function BrowseCard({ people, photoBase }: BrowseCardProps) {
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<BrowsePerson | null>(null);
  const [busy, setBusy] = useState(false);

  const person = people[index];

  if (matched) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-club/60 bg-zinc-900/80 p-10 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
          The floor just cleared for you two
        </p>
        <h2 className="mt-4 text-4xl font-extrabold">It&apos;s a match!</h2>
        <p className="mt-3 text-zinc-300">
          You and{' '}
          <span className="font-bold text-white">
            {matched.display_name || 'your match'}
          </span>{' '}
          picked each other. Instant.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => {
              setMatched(null);
              setIndex((i) => i + 1);
            }}
            className="rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton"
          >
            Keep browsing
          </button>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Chat unlocks in the next loop of the build.
        </p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
        <h2 className="text-2xl font-extrabold">You&apos;ve seen the room.</h2>
        <p className="mt-3 text-zinc-400">
          Everyone&apos;s been shown. Check back when the club&apos;s busier —
          new faces land here.
        </p>
      </div>
    );
  }

  const photo = person.photos.find((p) => p.is_primary) ?? person.photos[0];

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
          <span className="text-6xl font-extrabold text-zinc-600">
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
        <p className="mt-2 text-zinc-400">
          {person.bio || 'Just got through the door.'}
        </p>
      </div>
      <div className="flex gap-3 p-6 pt-0">
        <button
          onClick={() => setIndex((i) => i + 1)}
          disabled={busy}
          className="flex-1 rounded-lg border border-zinc-700 px-4 py-3 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
        >
          Pass
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            const result = await likeUser(person.id);
            setBusy(false);
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
