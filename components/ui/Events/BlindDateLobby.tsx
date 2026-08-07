'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBlindDate, joinBlindDate } from '@/app/events/actions';

interface OpenRoom {
  id: string;
  seated: number;
  maxSeats: number;
}

export default function BlindDateLobby({
  rooms,
  canHost
}: {
  rooms: OpenRoom[];
  canHost: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = async () => {
    setBusy(true);
    const res = await createBlindDate();
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  const join = async (id: string) => {
    setBusy(true);
    const res = await joinBlindDate(id);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-xs text-club">
          {error}
        </p>
      )}

      {canHost && (
        <div className="rounded-xl border border-gold/40 bg-zinc-900/50 p-6 text-center">
          <p className="text-club text-4xl">👑</p>
          <h2 className="font-header text-cyan mt-3 text-xl">
            Host a Blind Date
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-club">
            You&apos;re on the other side of the table. Ask the questions,
            read the answers, hand out the marks — and you leave with a date
            if they earn it. You host free; they pay for the chance.
          </p>
          <button
            onClick={host}
            disabled={busy}
            className="mt-5 rounded-lg bg-gold px-8 py-3 font-extrabold text-black transition hover:bg-gold-royal disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start the room →
          </button>
          <p className="mt-3 text-xs text-club">
            The room stays open 10 minutes to fill (3–5 suitors), then the
            clock starts. No bots — real members only.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-header text-cyan">Open rooms</h2>
        <p className="mt-1 text-xs text-club">
          You won&apos;t see her until you&apos;re in the room — that&apos;s the
          whole point. 15 tokens for the chance.
        </p>
        {rooms.length === 0 ? (
          <p className="mt-4 text-sm text-club">
            No rooms are open right now. Host one yourself, or check back —
            the ladies decide when the door opens.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="text-club flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-club">💘 Blind Date</p>
                  <p className="text-xs text-club">
                    {room.seated}/{room.maxSeats} seated ·{' '}
                    {room.seated >= 3
                      ? 'ready to run'
                      : `${3 - room.seated} more to run`}
                  </p>
                </div>
                <button
                  onClick={() => join(room.id)}
                  disabled={busy || room.seated >= room.maxSeats}
                  className="rounded-lg bg-club px-5 py-2 text-sm font-bold text-white transition hover:bg-club-cotton disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {room.seated >= room.maxSeats ? 'Full' : 'Take a seat →'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-club text-xs font-bold uppercase tracking-[0.3em]">
          How it works
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-club">
          4 rounds. She asks, you answer, she gives one mark to the best
          answer. Most marks wins the date. You never see the other answers —
          only where you stand.
        </p>
      </div>
    </div>
  );
}
