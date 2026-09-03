'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ASSETS } from '@/utils/assets';
import { submitRooftopPick } from '@/app/events/actions';

interface BoardMember {
  userId: string;
  displayName: string | null;
  photo: string | null;
}

interface RooftopPoolProps {
  eventId: string;
  eventStatus: string;
  startsAt: string;
  tokenCost: number;
  board: BoardMember[];
  round: { round_index: number; started_at: string } | null;
  myPicks: string[];
  myUserId: string;
  photoBase: string;
}

const ROUND_SECONDS = 10;
const MAX_PICKS = 3;

export default function RooftopPool({
  eventId,
  eventStatus: initialStatus,
  startsAt,
  tokenCost,
  board: initialBoard,
  round: initialRound,
  myPicks: initialPicks,
  myUserId,
  photoBase
}: RooftopPoolProps) {
  const supabase = createClient();
  const [eventStatus, setEventStatus] = useState(initialStatus);
  const [board, setBoard] = useState(initialBoard);
  const [round, setRound] = useState(initialRound);
  const [myPicks, setMyPicks] = useState(initialPicks);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [refunded, setRefunded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const [{ data: ev }, { data: entries }, { data: rounds }] =
        await Promise.all([
          supabase
            .from('events')
            .select('status')
            .eq('id', eventId)
            .maybeSingle(),
          supabase
            .from('event_entries')
            .select('user_id, status')
            .eq('event_id', eventId),
          supabase
            .from('rooftop_rounds')
            .select('round_index, started_at')
            .eq('event_id', eventId)
            .order('round_index', { ascending: false })
        ]);
      if (!alive) return;

      setEventStatus(ev?.status ?? initialStatus);

      const newest = (rounds ?? [])[0] ?? null;
      const active =
        newest &&
        new Date(newest.started_at).getTime() + ROUND_SECONDS * 1000 > Date.now()
          ? newest
          : null;
      setRound(
        active
          ? { round_index: active.round_index, started_at: active.started_at }
          : null
      );

      // The board = reserved members, live.
      const reserved = (entries ?? [])
        .filter((e) => e.status === 'reserved')
        .map((e) => e.user_id);
      setBoard((prev) => prev.filter((m) => reserved.includes(m.userId)));
      if (active) {
        const { data: picks } = await supabase
          .from('rooftop_picks')
          .select('pickee_id')
          .eq('event_id', eventId)
          .eq('round_index', active.round_index)
          .eq('picker_id', myUserId);
        if (alive) setMyPicks((picks ?? []).map((p) => p.pickee_id));
      }

      // If I'm not on the board anymore and the event is closed, find out why.
      if (ev?.status === 'closed') {
        const { data: mine } = await supabase
          .from('event_entries')
          .select('status')
          .eq('event_id', eventId)
          .eq('user_id', myUserId)
          .maybeSingle();
        if (alive && mine?.status === 'released') setRefunded(true);
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, initialStatus, myUserId]);

  useEffect(() => {
    if (eventStatus !== 'closed' || refunded) return;
    const find = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id')
        .eq('source', 'rooftop')
        .eq('status', 'active')
        .or(`user_id_a.eq.${myUserId},user_id_b.eq.${myUserId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setMatchId(data.id);
    };
    find();
  }, [eventStatus, refunded, myUserId, supabase]);

  const pick = async (memberId: string) => {
    if (!round || busy || myPicks.length >= MAX_PICKS) return;
    if (myPicks.includes(memberId)) return;
    setBusy(true);
    const res = await submitRooftopPick(eventId, round.round_index, memberId);
    setBusy(false);
    if (res.error) setError(res.error);
    else setMyPicks((prev) => [...prev, memberId]);
  };

  if (eventStatus === 'canceled') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-club text-4xl">🚪</p>
        <h2 className="font-header text-cyan mt-3 text-2xl">The pool didn&apos;t fill.</h2>
        <p className="mx-auto mt-2 max-w-md text-base text-club">
          Not enough heads on the rooftop — everyone&apos;s 40 tokens were
          returned.
        </p>
        <Link
          href="/events"
          className="mt-5 inline-block rounded-lg bg-diamond px-6 py-2.5 font-bold text-diamond-navy transition hover:bg-diamond-mist"
        >
          The Event Center
        </Link>
      </div>
    );
  }

  if (eventStatus === 'closed') {
    return (
      <div className="rounded-xl border border-diamond/40 bg-zinc-900/50 p-6 text-center">
        <p className="text-club text-4xl">{refunded ? '🎩' : '💘'}</p>
        <h2 className="font-header text-cyan mt-3 text-3xl">
          {refunded ? 'The odd one out.' : 'You got picked.'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-base text-club">
          {refunded
            ? 'The pool ended with nobody left to pair you with — so your 40 tokens came right back. No charge for a chance that never came.'
            : 'The final 1v1 (or an earlier round) did it — the chat is open up here. Make it count.'}
        </p>
        {!refunded && matchId && (
          <Link
            href={`/messages/${matchId}`}
            className="mt-5 inline-block rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton"
          >
            Open your chat →
          </Link>
        )}
      </div>
    );
  }

  const roundEnds = round
    ? new Date(round.started_at).getTime() + ROUND_SECONDS * 1000
    : Date.now();
  const left = Math.max(0, Math.ceil((roundEnds - now) / 1000));
  const others = board.filter((m) => m.userId !== myUserId);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-center">
        <p className="text-club text-sm font-extrabold uppercase tracking-[0.3em]">
          The Rooftop pool
        </p>
        <p className="mt-1 text-base text-club">
          {round
            ? `Round ${round.round_index + 1} — ${MAX_PICKS} picks, ${ROUND_SECONDS} seconds. Boom, boom, boom.`
            : 'The pool is forming — the first round is about to drop.'}
        </p>
        <div className="mt-2 font-mono text-xl font-bold text-diamond">
          {round ? `${left}s` : '—'}
        </div>
        <p className="mt-1 text-sm text-club">
          {myPicks.length}/{MAX_PICKS} picks fired
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-sm text-club">
          {error}
        </p>
      )}

      {/* The board — couples get escorted off between rounds. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {others.map((m) => {
          const picked = myPicks.includes(m.userId);
          return (
            <button
              key={m.userId}
              onClick={() => pick(m.userId)}
              disabled={busy || myPicks.length >= MAX_PICKS}
              className={`rounded-xl border p-3 text-center transition ${
                picked
                  ? 'border-diamond bg-diamond/10'
                  : 'border-zinc-800 bg-zinc-950/50 hover:border-diamond/60'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.photo ? `${photoBase}${m.photo}` : ASSETS.brand.entrance}
                alt=""
                className="mx-auto h-20 w-16 rounded-lg object-cover"
              />
              <p className="mt-2 text-sm font-bold text-club">
                {m.displayName ?? 'Member'}
              </p>
              {picked && (
                <p className="mt-1 text-sm font-extrabold text-club">✓ picked</p>
              )}
            </button>
          );
        })}
      </div>

      {others.length === 0 && (
        <p className="mt-6 text-center text-base text-club">
          You&apos;re the last one on the board — the final pair is coming.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-club">
        Mutual picks match at the end of the {ROUND_SECONDS}s and the couple
        leaves the board. When it&apos;s down to two, that&apos;s the date. {tokenCost}{' '}
        tokens, charged when you match.
      </p>
    </div>
  );
}
