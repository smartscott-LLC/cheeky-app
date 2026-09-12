'use client';

import { useEffect, useState } from 'react';
import {
  matchmakerDraftCandidates,
  matchmakerPickDraft,
  matchmakerStartBoard,
  type MatchmakerCandidate
} from '@/app/browse/actions';

interface Props {
  playsLeft: number | null;
  onBoardStarted: (boardId: string) => void;
}

/**
 * Phase 1 — the draft strip. Your floor or beneath, compatible faces only
 * (server-filtered). Two draft picks build the board; the picks are NOT real
 * likes — nothing matches from this screen. Click a face to pick it; click
 * again to un-pick. Already-picked faces from a previous session render
 * pre-selected.
 */
export default function MatchmakerDraft({ playsLeft, onBoardStarted }: Props) {
  const [people, setPeople] = useState<MatchmakerCandidate[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [picking, setPicking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      setError(null);
      const res = await matchmakerDraftCandidates();
      if (cancelled) return;
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setPeople(res.people);
      setPicked(new Set(res.people.filter((p) => p.picked).map((p) => p.id)));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  /**
   * Toggle a draft pick — click once to pick, click again to un-pick.
   * Server-call only for the initial pick; unpicks are optimistic.
   */
  const pick = async (person: MatchmakerCandidate) => {
    if (picking || building) return;

    const alreadyPicked = picked.has(person.id);

    if (alreadyPicked) {
      // Un-pick: remove from local state immediately
      setPicked((prev) => {
        const next = new Set(prev);
        next.delete(person.id);
        return next;
      });
      return;
    }

    if (picked.size >= 2) return;

    setPicking(true);
    setError(null);
    const res = await matchmakerPickDraft(person.id);
    setPicking(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPicked((prev) => new Set(prev).add(person.id));
  };

  const build = async () => {
    if (picked.size !== 2 || building || playsLeft === 0) return;
    setBuilding(true);
    setError(null);
    const res = await matchmakerStartBoard();
    setBuilding(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const boardId = res.rows?.[0]?.board_id;
    if (boardId) onBoardStarted(boardId);
  };

  if (busy && people.length === 0) {
    return (
      <p className="py-10 text-center text-base font-body text-club">
        Scouting your floor…
      </p>
    );
  }

  if (people.length === 0) {
    return (
      <div className="rounded-xl border border-gold bg-zinc-900/50 p-10 text-center">
        <p className="text-4xl">🌹</p>
        <h2 className="font-header text-cyan mt-3 text-2xl">
          The floor&apos;s empty — for now
        </h2>
        <p className="font-body text-club mx-auto mt-2 max-w-md text-base">
          No one new to draft tonight. New faces land after the next event —
          come back soon.
        </p>
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
      <div className="mx-auto flex max-w-md items-center justify-between">
        <p className="text-base font-semibold font-body text-club">
          Draft picks: <span className="text-gold">{picked.size}/2</span>
        </p>
        <p className="text-base font-body text-club">
          🎯 Plays left: <span className="text-gold">{playsLeft ?? '—'}</span>
        </p>
      </div>
      <p className="mx-auto mt-2 max-w-md text-center text-sm font-body text-club">
        Tap two faces from your floor (or below). Tap again to un-tap. These
        are drafts — not likes. Nothing matches from here.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {people.map((person) => {
          const chosen = picked.has(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => pick(person)}
              disabled={
                picking ||
                building ||
                (!chosen && picked.size >= 2)
              }
              className={`group overflow-hidden rounded-xl border bg-zinc-900/60 text-left transition-all duration-200 ${
                chosen
                  ? 'border-gold ring-2 ring-gold scale-[1.02]'
                  : 'border-zinc-700 hover:border-gold/60 hover:scale-[1.01]'
              }`}
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-800">
                {person.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${photoBase}${person.photo_path}`}
                    alt={person.display_name || 'Member'}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">
                    {person.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="font-header text-cyan text-sm truncate">
                  {person.display_name || 'Member'}
                </h3>
                {person.one_liner && (
                  <p className="mt-0.5 truncate text-[10px] font-body text-club">
                    {person.one_liner}
                  </p>
                )}
                <p
                  className={`mt-1 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 ${
                    chosen
                      ? 'bg-gold text-black'
                      : 'bg-zinc-800 text-gold'
                  }`}
                >
                  {chosen ? 'Chosen' : 'Draft'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        {playsLeft === 0 ? (
          <p className="text-base font-body text-club">
            You&apos;ve used today&apos;s plays — the dial resets in 24 hours.
          </p>
        ) : (
          <button
            onClick={build}
            disabled={picked.size !== 2 || building}
            className="rounded-lg bg-gold px-8 py-3 text-base font-bold text-black transition-all duration-200 hover:bg-gold-royal disabled:opacity-40"
          >
            {building
              ? 'Building the board…'
              : picked.size === 2
                ? 'Build the board →'
                : `Pick ${2 - picked.size} more to build`}
          </button>
        )}
      </div>
    </div>
  );
}
