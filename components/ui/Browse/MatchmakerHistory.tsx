'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  matchmakerHistory,
  type MatchmakerHistoryBoard
} from '@/app/browse/actions';
import { openConversation } from '@/app/messages/actions';

/**
 * The results wall — every finished board. Wins are celebrated; losses stay
 * quiet. A declined unlock is wrapped in the win: "they declined, but you
 * still won the game — your exclusive collectible is in your inventory"
 * (the rebound engine, PRD-matchmaker §6).
 */
export default function MatchmakerHistory() {
  const [boards, setBoards] = useState<MatchmakerHistoryBoard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await matchmakerHistory();
    setBoards(res.boards);
    setLoaded(true);
    if (res.error) setError(res.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  if (!loaded) return null;
  if (boards.length === 0) return null;

  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

  return (
    <div className="mt-12">
      <h2 className="font-header text-cyan text-center text-2xl">Your finds</h2>
      {error && (
        <p className="mt-3 text-center text-sm text-club">{error}</p>
      )}
      <div className="mx-auto mt-6 max-w-2xl space-y-4">
        {boards.map((board) => (
          <div
            key={board.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg">
                {board.status === 'won' ? '🎉 Won the board' : '🫧 Three strikes'}
                <span className="ml-2 text-sm text-zinc-400">
                  {dateLabel(board.created_at)}
                </span>
              </p>
              <p className="text-sm text-club">
                {board.matches_found}/2 found · {board.strikes} strikes
              </p>
            </div>

            {board.unlocks.length === 0 ? (
              <p className="mt-3 text-sm text-club">
                No unlocks this board — every board is a new shot.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {board.unlocks.map((unlock) => (
                  <div
                    key={unlock.id}
                    className="rounded-lg border border-zinc-800 bg-black/40 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                        {unlock.photo_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${photoBase}${unlock.photo_path}`}
                            alt={unlock.display_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">
                            {unlock.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">
                          {unlock.display_name}
                          <span className="ml-2 text-xs font-normal text-zinc-400">
                            {unlock.status === 'accepted'
                              ? 'Accepted'
                              : unlock.status === 'declined'
                                ? 'Declined'
                                : 'First impression sent'}
                          </span>
                        </p>
                        <p className="truncate text-sm text-club italic">
                          “{unlock.message}”
                        </p>
                      </div>
                    </div>

                    {unlock.status === 'accepted' && (
                      <button
                        onClick={() => openConversation(unlock.recipient_id)}
                        className="mt-3 w-full rounded-lg bg-club px-4 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
                      >
                        You&apos;re talking — open the chat →
                      </button>
                    )}

                    {unlock.status === 'declined' && (
                      <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-center">
                        <p className="text-sm text-club">
                          They declined — <span className="font-semibold text-gold">but you still won the game.</span>
                        </p>
                        <p className="mt-1 text-sm text-club">
                          {unlock.consolation ? (
                            <>
                              Your{' '}
                              <span className="font-semibold text-gold">
                                {unlock.consolation.emoji} {unlock.consolation.name}
                              </span>{' '}
                              — a Matchmaker-exclusive, never for sale — is in your
                              inventory. Regift it, keep it, or collect the rest.
                            </>
                          ) : (
                            <>A Matchmaker-exclusive collectible is in your inventory.</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
