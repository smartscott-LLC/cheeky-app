'use client';

import { useEffect, useState } from 'react';
import {
  matchmakerHistory,
  type MatchmakerHistoryBoard
} from '@/app/browse/actions';
import { openConversation } from '@/app/messages/actions';

/**
 * The results wall — every finished board with ALL unlock activity:
 * sent (waiting for reply), accepted (chat open), declined (silent end).
 * A clear button wipes completed boards from the view.
 */
export default function MatchmakerHistory() {
  const [boards, setBoards] = useState<MatchmakerHistoryBoard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    void matchmakerHistory().then((res) => {
      setBoards(res.boards);
      setLoaded(true);
      if (res.error) setError(res.error);
    });
  }, []);

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const totalUnlocks = boards.reduce((sum, b) => sum + b.unlocks.length, 0);
  const sentUnlocks = boards
    .flatMap((b) => b.unlocks)
    .filter((u) => u.status === 'sent');
  const acceptedUnlocks = boards
    .flatMap((b) => b.unlocks)
    .filter((u) => u.status === 'accepted');
  const declinedUnlocks = boards
    .flatMap((b) => b.unlocks)
    .filter((u) => u.status === 'declined');

  if (!loaded) return null;
  if (boards.length === 0 && sentUnlocks.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between px-6">
        <h2 className="font-header text-cyan text-2xl">
          Your Matchmaker Activity
        </h2>
        {boards.length > 0 && (
          <button
            onClick={() => {
              setBoards([]);
              setLoaded(true);
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm font-body text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary chips */}
      {totalUnlocks > 0 && (
        <div className="mt-4 flex gap-2 px-6 flex-wrap">
          {sentUnlocks.length > 0 && (
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-400">
              ⏳ {sentUnlocks.length} waiting reply
            </span>
          )}
          {acceptedUnlocks.length > 0 && (
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
              ✅ {acceptedUnlocks.length} accepted
            </span>
          )}
          {declinedUnlocks.length > 0 && (
            <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-bold text-zinc-400">
              ❌ {declinedUnlocks.length} declined
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mx-6 mt-3 text-center text-sm font-body text-club">
          {error}
        </p>
      )}

      {/* All unlocks grouped by status, then by board */}
      <div className="mx-6 mt-6 space-y-6">
        {/* Waiting for reply */}
        {sentUnlocks.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-yellow-500">
              Waiting for reply
            </p>
            <div className="space-y-3">
              {sentUnlocks.map((unlock) => {
                const board = boards.find((b) => b.id === unlock.board_id);
                return (
                  <div
                    key={unlock.id}
                    className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                        {unlock.photo_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${photoBase}${unlock.photo_path}`}
                            alt={unlock.display_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-cyan">
                            {unlock.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">
                          {unlock.display_name || 'Someone'}
                        </p>
                        <p className="text-sm font-body text-club italic">
                          "{unlock.message}"
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Sent{' '}
                          {board ? dateLabel(board.created_at) : 'recently'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-bold text-yellow-400">
                        ⏳
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Accepted matches */}
        {acceptedUnlocks.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-green-500">
              Active chats
            </p>
            <div className="space-y-3">
              {acceptedUnlocks.map((unlock) => (
                <div
                  key={unlock.id}
                  className="rounded-xl border border-green-500/30 bg-green-500/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                      {unlock.photo_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${photoBase}${unlock.photo_path}`}
                          alt={unlock.display_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-cyan">
                          {unlock.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">
                        {unlock.display_name || 'Someone'}
                      </p>
                      <p className="text-sm font-body text-club italic">
                        "{unlock.message}"
                      </p>
                      <button
                        onClick={() => openConversation(unlock.recipient_id)}
                        className="mt-2 rounded-lg bg-club px-3 py-1.5 text-sm font-bold text-white transition hover:bg-club-cotton"
                      >
                        Open chat →
                      </button>
                    </div>
                    <span className="shrink-0 rounded-full bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">
                      ✅
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Old boards with declines/no replies */}
        {boards.filter((b) => b.unlocks.length > 0).length > 0 && (
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Past boards
            </p>
            <div className="space-y-4">
              {boards
                .filter((b) => b.unlocks.length > 0)
                .map((board) => (
                  <div
                    key={board.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-lg">
                        {board.status === 'won'
                          ? '🎉 Won the board'
                          : '🫧 Three strikes'}
                        <span className="ml-2 text-sm text-zinc-400">
                          {dateLabel(board.created_at)}
                        </span>
                      </p>
                      <p className="text-sm font-body text-club">
                        {board.matches_found}/2 found · {board.strikes} strikes
                      </p>
                    </div>

                    {board.unlocks.length === 0 ? (
                      <p className="mt-3 text-sm font-body text-club">
                        No unlocks this board.
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
                                    {unlock.display_name
                                      .charAt(0)
                                      .toUpperCase()}
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
                                        : 'Sent'}
                                  </span>
                                </p>
                                <p className="truncate text-sm font-body text-club italic">
                                  "{unlock.message}"
                                </p>
                              </div>
                            </div>

                            {unlock.status === 'accepted' && (
                              <button
                                onClick={() =>
                                  openConversation(unlock.recipient_id)
                                }
                                className="mt-3 w-full rounded-lg bg-club px-4 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
                              >
                                You&apos;re talking — open the chat →
                              </button>
                            )}

                            {unlock.status === 'declined' && (
                              <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-center">
                                <p className="text-sm font-body text-club">
                                  They declined —{' '}
                                  <span className="font-semibold text-gold">
                                    but you still won the game.
                                  </span>
                                </p>
                                <p className="mt-1 text-sm font-body text-club">
                                  {unlock.consolation ? (
                                    <>
                                      Your{' '}
                                      <span className="font-semibold text-gold">
                                        {unlock.consolation.emoji}{' '}
                                        {unlock.consolation.name}
                                      </span>{' '}
                                      — a Matchmaker-exclusive is in your
                                      inventory.
                                    </>
                                  ) : (
                                    'A Matchmaker-exclusive collectible is in your inventory.'
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
        )}
      </div>
    </div>
  );
}
