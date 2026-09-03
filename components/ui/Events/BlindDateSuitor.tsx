'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ASSETS } from '@/utils/assets';
import { submitBlindAnswer } from '@/app/events/actions';

interface RoundRow {
  id: string;
  round_index: number;
  phase: string;
  phase_started_at: string;
  question: string | null;
  skipped: boolean;
  tally_user_id: string | null;
}

interface BlindDateSuitorProps {
  eventId: string;
  eventStatus: string;
  tokenCost: number;
  hostName: string | null;
  hostPhoto: string | null;
  suitors: { userId: string; displayName: string | null }[];
  round: RoundRow | null;
  myAnswer: string | null;
  tallyCounts: Record<string, number>;
  myUserId: string;
  photoBase: string;
}

const PHASE_SECONDS = 60;

export default function BlindDateSuitor({
  eventId,
  eventStatus: initialStatus,
  tokenCost,
  hostName,
  hostPhoto,
  suitors,
  round: initialRound,
  myAnswer: initialAnswer,
  tallyCounts: initialCounts,
  myUserId,
  photoBase
}: BlindDateSuitorProps) {
  const supabase = createClient();
  const [eventStatus, setEventStatus] = useState(initialStatus);
  const [round, setRound] = useState<RoundRow | null>(initialRound);
  const [myAnswer, setMyAnswer] = useState(initialAnswer);
  const [counts, setCounts] = useState(initialCounts);
  const [now, setNow] = useState(Date.now());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const [{ data: ev }, { data: rounds }] = await Promise.all([
        supabase
          .from('events')
          .select('status')
          .eq('id', eventId)
          .maybeSingle(),
        supabase
          .from('blind_date_rounds')
          .select('*')
          .eq('event_id', eventId)
          .order('round_index')
      ]);
      if (!alive) return;

      setEventStatus(ev?.status ?? initialStatus);

      const rows = (rounds ?? []) as RoundRow[];
      const current =
        rows.filter((r) => r.phase !== 'done').sort((a, b) => b.round_index - a.round_index)[0] ??
        null;
      setRound(current);
      setCounts(
        rows.reduce<Record<string, number>>((acc, r) => {
          if (r.tally_user_id) acc[r.tally_user_id] = (acc[r.tally_user_id] ?? 0) + 1;
          return acc;
        }, {})
      );
      if (current) {
        // RLS shows suitors only their own answer.
        const { data: mine } = await supabase
          .from('blind_date_answers')
          .select('body')
          .eq('round_id', current.id)
          .eq('user_id', myUserId)
          .maybeSingle();
        if (alive) setMyAnswer(mine?.body ?? null);
      }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, initialStatus, myUserId]);

  useEffect(() => {
    if (eventStatus !== 'closed') return;
    const find = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id')
        .eq('source', 'blind_date')
        .eq('status', 'active')
        .or(`user_id_a.eq.${myUserId},user_id_b.eq.${myUserId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setMatchId(data.id);
    };
    find();
  }, [eventStatus, myUserId, supabase]);

  if (eventStatus === 'canceled') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="font-body text-club text-4xl">🚪</p>
        <h2 className="font-header text-cyan mt-3 text-2xl">The room closed.</h2>
        <p className="mx-auto mt-2 max-w-md text-base font-body text-club">
          It didn&apos;t fill in time, or the room failed — either way your 15
          tokens were returned. No harm done.
        </p>
        <Link
          href="/events/blind_date"
          className="mt-5 inline-block rounded-lg bg-gold px-6 py-2.5 font-bold text-black transition hover:bg-gold-royal"
        >
          Back to Blind Date
        </Link>
      </div>
    );
  }

  if (eventStatus === 'closed') {
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const won = top?.[0] === myUserId;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="font-body text-club text-4xl">{won ? '💘' : '🎩'}</p>
        <h2 className="font-header text-cyan mt-3 text-3xl">
          {won ? 'You got the date.' : 'Not this time.'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-base font-body text-club">
          {won
            ? 'She picked you — the chat is open. Make it count.'
            : 'The seat was the chance; the answers did the talking. That one’s on the answers.'}
        </p>
        {won && matchId && (
          <Link
            href={`/messages/${matchId}`}
            className="mt-5 inline-block rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton"
          >
            Open your chat →
          </Link>
        )}
        <p className="mt-4 text-sm font-body text-club">
          Your {tokenCost} tokens were spent on the chance — that&apos;s the deal.
        </p>
      </div>
    );
  }

  const phase = round?.phase ?? 'question';
  const phaseStart = round
    ? new Date(round.phase_started_at).getTime()
    : Date.now();
  const left = Math.max(0, PHASE_SECONDS - Math.floor((now - phaseStart) / 1000));
  const final = round?.round_index === 4;
  const roundLabel = final
    ? 'THE FINAL ROUND'
    : `Round ${(round?.round_index ?? 0) + 1} of 4`;
  const leading = suitors
    .map((s) => ({ ...s, count: counts[s.userId] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .filter((s) => s.count > 0);

  const send = async () => {
    if (!answer.trim() || !round || busy) return;
    setBusy(true);
    const res = await submitBlindAnswer(eventId, round.round_index, answer.trim());
    setBusy(false);
    if (res.error) setError(res.error);
    else setMyAnswer(answer.trim());
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-center">
        <p
          className={`text-sm font-extrabold uppercase tracking-[0.3em] ${
            final ? 'text-gold' : 'font-body text-club'
          }`}
        >
          {roundLabel}
        </p>
        <p className="mt-1 text-base font-body text-club">
          {phase === 'question' && 'She’s writing her question…'}
          {phase === 'answer' && 'Answer her — you have a minute.'}
          {phase === 'selection' && 'She’s reading and choosing…'}
          {phase === 'done' && 'Round complete — the next round is coming.'}
        </p>
        <div className="mt-2 font-mono text-xl font-bold text-gold">
          {phase === 'done' ? '—' : `${left}s`}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-sm font-body text-club">
          {error}
        </p>
      )}

      {/* She's on the other side — they can see her now that they're in. */}
      <div className="mt-6 flex items-center justify-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hostPhoto ? `${photoBase}${hostPhoto}` : ASSETS.brand.entrance}
          alt=""
          className="h-24 w-20 rounded-xl object-cover"
        />
        <div>
          <p className="font-body text-club text-xl font-extrabold">{hostName ?? 'The hostess'}</p>
          <p className="text-sm font-body text-club">
            She can&apos;t see any of you — personality decides tonight.
          </p>
        </div>
      </div>

      {round?.question && (
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-center">
          <p className="font-body text-club text-sm font-bold uppercase tracking-[0.2em]">
            Her question
          </p>
          <p className="mt-1 text-base font-body text-club">“{round.question}”</p>
        </div>
      )}

      {phase === 'answer' && (
        <div className="mt-6">
          <label className="text-sm font-bold uppercase tracking-[0.2em] text-cyan">
            Your answer — she sees yours alone
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Say what you’d say across the table…"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-base text-white placeholder-zinc-500 focus:border-gold focus:outline-none"
          />
          <button
            onClick={send}
            disabled={busy || !answer.trim() || Boolean(myAnswer)}
            className="mt-3 rounded-lg bg-gold px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-gold-royal disabled:cursor-not-allowed disabled:opacity-40"
          >
            {myAnswer ? '✓ Answer sent' : 'Send your answer'}
          </button>
        </div>
      )}

      {/* The standing — you get to see who's leading, never what they said. */}
      <div className="mt-6">
        <p className="font-body text-club text-sm font-bold uppercase tracking-[0.2em]">
          The standing
        </p>
        {leading.length === 0 ? (
          <p className="mt-2 text-sm font-body text-club">
            No marks yet — it’s all still to play for.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {leading.map((s) => (
              <li key={s.userId} className="font-body text-club flex justify-between text-base">
                <span className="text-white">{s.displayName ?? 'Gentleman'}</span>
                <span className="font-mono font-bold text-gold">
                  {s.count} {s.count === 1 ? 'mark' : 'marks'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-center text-sm font-body text-club">
        {tokenCost} tokens for the chance. Most marks at the end wins the date.
      </p>
    </div>
  );
}
