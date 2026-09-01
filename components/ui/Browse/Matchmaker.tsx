'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  matchmakerRespondUnlock,
  matchmakerStartDraft,
  matchmakerState,
  type MatchmakerActiveBoard,
  type MatchmakerIncoming
} from '@/app/browse/actions';
import { openConversation } from '@/app/messages/actions';
import MatchmakerDraft from './MatchmakerDraft';
import MatchmakerBoard from './MatchmakerBoard';
import MatchmakerHistory from './MatchmakerHistory';

/**
 * The Matchmaker room — orchestrates draft → board → results, and surfaces
 * incoming unlocks ("someone discovered you in Matchmaker") with accept /
 * decline. The recipient alert polls lightly; no realtime in v1.
 */
export default function Matchmaker() {
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [incoming, setIncoming] = useState<MatchmakerIncoming[]>([]);
  const [active, setActive] = useState<MatchmakerActiveBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomingBusy, setIncomingBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await matchmakerState();
    setPlaysLeft(res.playsLeft);
    setIncoming(res.incoming);
    setActive(res.active);
    setLoading(false);
    if (res.error) setError(res.error);
  }, []);

  useEffect(() => {
    refresh();
    // The alert is time-sensitive: check for new discoveries on a light poll.
    const t = setInterval(() => {
      matchmakerState().then((res) => setIncoming(res.incoming));
    }, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const beginDraft = async () => {
    setError(null);
    const res = await matchmakerStartDraft();
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.boardId) {
      setActive({
        id: res.boardId,
        status: 'drafting',
        strikes: 0,
        matches_found: 0,
        flipped_card_id: null
      });
    }
  };

  const respond = async (unlockId: string, accept: boolean) => {
    setIncomingBusy(unlockId);
    setError(null);
    const res = await matchmakerRespondUnlock(unlockId, accept);
    setIncomingBusy(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (accept) {
      const u = incoming.find((i) => i.unlock_id === unlockId);
      if (u) await openConversation(u.sender_id);
      return;
    }
    refresh();
  };

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  if (loading) {
    return (
      <p className="py-10 text-center text-base text-club">Shuffling the deck…</p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mx-auto mb-4 max-w-md rounded-lg border border-club/40 bg-club/10 px-4 py-2 text-center text-base text-club">
          {error}
        </p>
      )}

      {incoming.length > 0 && (
        <div className="mx-auto mb-8 max-w-2xl">
          <h2 className="font-header text-cyan text-center text-xl">
            Someone found you
          </h2>
          <div className="mt-4 space-y-4">
            {incoming.map((u) => (
              <div
                key={u.unlock_id}
                className="rounded-xl border border-gold bg-zinc-900/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                    {u.photo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${photoBase}${u.photo_path}`}
                        alt={u.display_name || 'Member'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        {u.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">
                      {u.display_name || 'Someone'} discovered you in Matchmaker
                    </p>
                    <p className="mt-1 text-sm text-club italic">
                      “{u.message}”
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => respond(u.unlock_id, true)}
                        disabled={incomingBusy === u.unlock_id}
                        className="flex-1 rounded-lg bg-club px-4 py-2 text-sm font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
                      >
                        Accept — open the chat
                      </button>
                      <button
                        onClick={() => respond(u.unlock_id, false)}
                        disabled={incomingBusy === u.unlock_id}
                        className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
                      >
                        Decline — silently
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active?.status === 'live' ? (
        <MatchmakerBoard
          boardId={active.id}
          flippedCardId={active.flipped_card_id}
          onFinished={refresh}
        />
      ) : active ? (
        <MatchmakerDraft playsLeft={playsLeft} onBoardStarted={refresh} />
      ) : playsLeft === 0 ? (
        <p className="mt-6 text-center text-base text-club">
          You&apos;ve used today&apos;s plays — the dial resets in 24 hours.
        </p>
      ) : (
        <div className="mt-8 text-center">
          <button
            onClick={beginDraft}
            className="rounded-lg border border-gold px-8 py-3 text-base font-bold text-gold transition hover:bg-gold/10"
          >
            🎯 New board
          </button>
        </div>
      )}

      <MatchmakerHistory />
    </div>
  );
}
