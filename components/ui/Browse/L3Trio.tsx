'use client';

import { useCallback, useEffect, useState } from 'react';
import { openConversation } from '@/app/messages/actions';
import { l3NextTrio, l3Pick, type L3Person, type L3PickResult } from '@/app/browse/actions';

type Choice = 'leave' | 'like' | 'love';

const SLOTS: { choice: Choice; label: string; cls: string; active: string }[] = [
  {
    choice: 'leave',
    label: 'Leave',
    cls: 'border-zinc-600 text-zinc-300 hover:border-zinc-400',
    active: 'bg-zinc-600 text-white border-zinc-500'
  },
  {
    choice: 'like',
    label: 'Like',
    cls: 'border-cyan/50 text-cyan hover:border-cyan',
    active: 'bg-cyan text-black border-cyan'
  },
  {
    choice: 'love',
    label: 'Love',
    cls: 'border-gold/50 text-gold hover:border-gold',
    active: 'bg-gold text-black border-gold'
  }
];

type Outcome = {
  person: L3Person;
  result: L3PickResult;
};

export default function L3Trio() {
  const [people, setPeople] = useState<L3Person[]>([]);
  const [assigned, setAssigned] = useState<Record<string, Choice>>({});
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrio = useCallback(async () => {
    setBusy(true);
    setError(null);
    setAssigned({});
    setOutcomes(null);
    const res = await l3NextTrio();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPeople(res.people);
    setDone(res.done);
  }, []);

  useEffect(() => {
    loadTrio();
  }, [loadTrio]);

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;
  const allAssigned = people.length > 0 && people.every((p) => assigned[p.id]);

  const submit = async () => {
    if (!allAssigned || submitting) return;
    setSubmitting(true);
    setError(null);
    const results: Outcome[] = [];
    for (const person of people) {
      const result = await l3Pick(person.id, assigned[person.id]);
      results.push({ person, result });
    }
    setSubmitting(false);
    setOutcomes(results);
  };

  const sayHi = async (personId: string) => {
    await openConversation(personId);
  };

  if (busy && people.length === 0) {
    return <p className="py-10 text-center text-base font-body text-club">Rounding up tonight&apos;s trio…</p>;
  }

  if (done) {
    return (
      <div className="rounded-xl border border-gold bg-zinc-900/50 p-10 text-center">
        <p className="text-4xl">🌹</p>
        <h2 className="font-header text-cyan mt-3 text-2xl">The room&apos;s empty — for now</h2>
        <p className="font-body text-club mx-auto mt-2 max-w-md text-base">
          You&apos;ve picked everyone out there. New faces land after the next event — come back
          soon.
        </p>
        <button
          onClick={loadTrio}
          className="mt-6 rounded-lg bg-club px-6 py-2.5 text-base font-bold text-white transition hover:bg-club-cotton"
        >
          Check again
        </button>
      </div>
    );
  }

  if (outcomes) {
    const matches = outcomes.filter((o) => o.result.matchId);
    return (
      <div className="space-y-4">
        {matches.map(({ person, result }) => (
          <div
            key={person.id}
            className="rounded-xl border border-gold bg-zinc-900/60 p-6 text-center"
          >
            <p className="text-4xl">{result.tier === 't2' ? '💥' : '💘'}</p>
            <h2 className="font-header text-cyan mt-2 text-2xl">
              {result.tier === 't2' ? 'SUPER MATCH!' : 'It’s a match!'}
            </h2>
            <p className="font-body text-club mt-2 text-base">
              {result.tier === 't2'
                ? 'The club popped a cork — a gift’s on its way to both of you, and you’ve got a free line to talk.'
                : 'You matched with them — and the club gave you a free line to start the conversation.'}
            </p>
            <button
              onClick={() => sayHi(person.id)}
              className="mt-4 rounded-lg bg-gold px-6 py-2.5 text-base font-bold text-black transition hover:bg-gold-royal"
            >
              Say hi →
            </button>
          </div>
        ))}
        {matches.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-4xl">🫧</p>
            <h2 className="font-header text-cyan mt-2 text-2xl">No sparks this time</h2>
            <p className="font-body text-club mt-2 text-base">
              Nothing came back — quietly. Nobody knows. The next trio might be the one.
            </p>
          </div>
        )}
        <button
          onClick={loadTrio}
          className="mx-auto block rounded-lg border border-gold px-6 py-2.5 text-base font-bold text-gold transition hover:bg-gold/10"
        >
          Next trio →
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg border border-club/40 bg-club/10 px-4 py-2 text-base font-body text-club">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {people.map((person) => (
          <div
            key={person.id}
            className="overflow-hidden rounded-xl border border-gold bg-zinc-900/60"
          >
            <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-800">
              {person.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${photoBase}${person.photo_path}`}
                  alt={person.display_name || 'Member'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  {person.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-header text-cyan text-xl">{person.display_name || 'Member'}</h3>
              {person.one_liner && (
                <p className="mt-1 text-sm font-body text-club">{person.one_liner}</p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SLOTS.map((slot) => {
                  const selected = assigned[person.id] === slot.choice;
                  return (
                    <button
                      key={slot.choice}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setAssigned((prev) => ({ ...prev, [person.id]: slot.choice }))
                      }
                      className={`rounded-md border px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                        selected ? slot.active : slot.cls
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={!allAssigned || submitting}
        className="mx-auto mt-6 block rounded-lg bg-club px-8 py-3 text-base font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
      >
        {submitting ? 'Checking the room…' : 'Boom — send the trio'}
      </button>
    </div>
  );
}
