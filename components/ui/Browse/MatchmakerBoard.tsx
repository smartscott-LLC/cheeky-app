'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  matchmakerBoardCards,
  matchmakerBoardUnlocks,
  matchmakerFlip,
  matchmakerSendUnlock,
  type MatchmakerCard
} from '@/app/browse/actions';

interface Props {
  boardId: string;
  flippedCardId: string | null;
  onFinished: () => void;
}

interface Reveal {
  target_id: string;
  display_name: string;
  photo_path: string | null;
}

interface Ended {
  status: 'won' | 'lost';
  strikes: number;
  matches: number;
}

/**
 * Phase 2 — the 4×4 board. 8 people, 2 cards each, face down. Flip two:
 * a pair unlocks a first-impression message to that person; a miss costs a
 * strike. 2 matches win, 3 strikes lose. The server is the referee — the
 * client only renders what matchmaker_flip reveals.
 */
export default function MatchmakerBoard({ boardId, flippedCardId, onFinished }: Props) {
  const [cards, setCards] = useState<MatchmakerCard[]>([]);
  const [faceUp, setFaceUp] = useState<Record<string, Reveal>>({});
  const [firstFlipId, setFirstFlipId] = useState<string | null>(flippedCardId);
  const [strikes, setStrikes] = useState(0);
  const [matches, setMatches] = useState(0);
  const [unlockSentFor, setUnlockSentFor] = useState<Set<string>>(new Set());
  const [unlockTarget, setUnlockTarget] = useState<{
    cardId: string;
    person: Reveal;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [sendingUnlock, setSendingUnlock] = useState(false);
  const [unlockSent, setUnlockSent] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const strikeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  const load = useCallback(async () => {
    const [cardsRes, unlocksRes] = await Promise.all([
      matchmakerBoardCards(boardId),
      matchmakerBoardUnlocks(boardId)
    ]);
    if (cardsRes.error || unlocksRes.error) {
      setError(cardsRes.error ?? unlocksRes.error ?? null);
      return;
    }
    setCards(cardsRes.cards);
    setUnlockSentFor(unlocksRes.sent);
    // Restore face-up state: matched pairs + the current flip (resume-safe).
    const up: Record<string, Reveal> = {};
    for (const c of cardsRes.cards) {
      if (c.matched && c.display_name) {
        up[c.id] = {
          target_id: c.target_id!,
          display_name: c.display_name,
          photo_path: c.photo_path
        };
      } else if (c.id === flippedCardId && c.display_name) {
        up[c.id] = {
          target_id: c.target_id!,
          display_name: c.display_name,
          photo_path: c.photo_path
        };
      }
    }
    setFaceUp(up);
  }, [boardId, flippedCardId]);

  useEffect(() => {
    load();
    return () => {
      if (strikeTimer.current) clearTimeout(strikeTimer.current);
    };
  }, [load]);

  const flip = async (card: MatchmakerCard) => {
    if (busyId || ended || unlockTarget || sendingUnlock) return;
    if (faceUp[card.id]) return;
    setBusyId(card.id);
    setError(null);
    const res = await matchmakerFlip(card.id);
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    const f = res.flip!;
    const reveal: Reveal = {
      target_id: f.target_id,
      display_name: f.display_name,
      photo_path: f.photo_path
    };

    if (f.is_match === null) {
      // First flip of the attempt — hold the face up, awaiting its mate.
      setFaceUp((prev) => ({ ...prev, [card.id]: reveal }));
      setFirstFlipId(card.id);
      return;
    }

    if (f.is_match) {
      // MATCH — both cards stay up; the unlock is earned for that person.
      setFaceUp((prev) => {
        const next = { ...prev, [card.id]: reveal };
        if (f.first_card_id && next[f.first_card_id]) {
          next[f.first_card_id] = next[f.first_card_id];
        }
        return next;
      });
      setFirstFlipId(null);
      setStrikes(f.strikes);
      setMatches(f.matches_found);
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id || c.id === f.first_card_id
            ? { ...c, matched: true }
            : c
        )
      );
      if (f.board_status === 'won') {
        setEnded({ status: 'won', strikes: f.strikes, matches: f.matches_found });
      } else if (!unlockSentFor.has(f.target_id)) {
        setUnlockTarget({ cardId: card.id, person: reveal });
      }
      return;
    }

    // STRIKE — show both briefly, then flip back down.
    setFaceUp((prev) => ({ ...prev, [card.id]: reveal }));
    setFirstFlipId(null);
    setStrikes(f.strikes);
    if (f.board_status === 'lost') {
      setEnded({ status: 'lost', strikes: f.strikes, matches: f.matches_found });
    } else {
      strikeTimer.current = setTimeout(() => {
        setFaceUp((prev) => {
          const next = { ...prev };
          delete next[card.id];
          if (f.first_card_id) delete next[f.first_card_id];
          return next;
        });
      }, 900);
    }
  };

  const sendUnlock = async () => {
    if (!unlockTarget || sendingUnlock) return;
    const body = message.trim();
    if (!body) return;
    setSendingUnlock(true);
    setError(null);
    const res = await matchmakerSendUnlock(unlockTarget.cardId, body);
    setSendingUnlock(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setUnlockSentFor((prev) => new Set(prev).add(unlockTarget.person.target_id));
    setUnlockSent(true);
  };

  const unsentMatches = cards.filter(
    (c) => c.matched && !unlockSentFor.has(c.target_id!)
  );

  if (ended) {
    const won = ended.status === 'won';
    return (
      <div className="rounded-xl border border-gold bg-zinc-900/60 p-8 text-center">
        <p className="text-5xl">{won ? '🎉' : '🫧'}</p>
        <h2 className="font-header text-cyan mt-3 text-3xl">
          {won ? 'FULL HOUSE!' : 'Three strikes'}
        </h2>
        <p className="font-body text-club mx-auto mt-2 max-w-md text-base">
          {won
            ? `You found ${ended.matches} pairs and unlocked ${unlockSentFor.size} first impression${unlockSentFor.size === 1 ? '' : 's'}.`
            : `You found ${ended.matches} pair${ended.matches === 1 ? '' : 's'} before the strikes ran out.`}
        </p>
        {!won && ended.matches > 0 && (
          <p className="font-body text-club mx-auto mt-1 max-w-md text-sm">
            The pair you matched stays unlocked — a win is a win.
          </p>
        )}
        {unsentMatches.length > 0 && (
          <div className="mx-auto mt-4 max-w-md space-y-2">
            {unsentMatches.map((c) => {
              const reveal = faceUp[c.id];
              if (!reveal) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setUnlockTarget({ cardId: c.id, person: reveal });
                    setUnlockSent(false);
                  }}
                  className="w-full rounded-lg border border-gold/50 px-4 py-2 text-base font-semibold text-gold transition hover:bg-gold/10"
                >
                  Send your first impression to {reveal.display_name} →
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={onFinished}
          className="mt-6 rounded-lg bg-gold px-8 py-3 text-base font-bold text-black transition hover:bg-gold-royal"
        >
          See your finds →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-sm font-semibold font-body text-club">Strikes</span>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`text-lg ${i < strikes ? '' : 'opacity-25'}`}>
              ❤️
            </span>
          ))}
        </div>
        <p className="text-base font-semibold font-body text-club">
          Found <span className="text-gold">{matches}/2</span>
        </p>
      </div>

      {error && (
        <p className="mx-auto mt-3 max-w-md rounded-lg border border-club/40 bg-club/10 px-4 py-2 text-center text-base font-body text-club">
          {error}
        </p>
      )}

      <div className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-2">
        {cards.map((card) => {
          const up = faceUp[card.id];
          const awaiting = firstFlipId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card)}
              disabled={!!busyId || !!up}
              className={`relative aspect-square overflow-hidden rounded-lg border transition ${
                up
                  ? 'border-gold'
                  : 'border-gold/40 bg-gradient-to-br from-zinc-800 to-zinc-900 hover:border-gold'
              } ${busyId ? 'cursor-wait' : ''}`}
            >
              {up ? (
                <>
                  {up.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${photoBase}${up.photo_path}`}
                      alt={up.display_name || 'Member'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-2xl">
                      {up.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[10px] font-bold text-white">
                    {up.display_name}
                  </span>
                </>
              ) : (
                <span
                  className={`flex h-full w-full items-center justify-center text-2xl ${
                    awaiting ? '' : ''
                  }`}
                >
                  🎯
                </span>
              )}
            </button>
          );
        })}
      </div>

      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gold bg-zinc-900 p-6">
            <p className="text-4xl">💌</p>
            <h3 className="font-header text-cyan mt-2 text-2xl">
              You found {unlockTarget.person.display_name}!
            </h3>
            <p className="font-body text-club mt-1 text-sm">
              {unlockSent
                ? 'Your first impression is on its way. They decide — accept opens the chat, decline is silent. Either way, you won the game.'
                : 'One first impression — even if they never liked you back. It never touches your message limits.'}
            </p>
            {unlockSent ? (
              <button
                onClick={() => {
                  setUnlockTarget(null);
                  setMessage('');
                  setUnlockSent(false);
                }}
                className="mt-5 w-full rounded-lg bg-gold px-6 py-3 text-base font-bold text-black transition hover:bg-gold-royal"
              >
                Back to the board
              </button>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Make it count — this is your one shot."
                  className="mt-4 w-full rounded-lg border border-zinc-700 bg-black p-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold"
                />
                {error && (
                  <p className="mt-2 text-sm font-body text-club">{error}</p>
                )}
                <button
                  onClick={sendUnlock}
                  disabled={!message.trim() || sendingUnlock}
                  className="mt-3 w-full rounded-lg bg-club px-6 py-3 text-base font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
                >
                  {sendingUnlock ? 'Sending…' : 'Send the first impression'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
