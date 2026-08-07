'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  submitBlindQuestion,
  selectBlindTally
} from '@/app/events/actions';

interface Suitor {
  userId: string;
  displayName: string | null;
  photo: string | null;
}

interface RoundRow {
  id: string;
  round_index: number;
  phase: string;
  phase_started_at: string;
  question: string | null;
  skipped: boolean;
  tally_user_id: string | null;
}

interface BlindDateHostProps {
  eventId: string;
  eventStatus: string;
  tokenCost: number;
  suitors: Suitor[];
  round: RoundRow | null;
  answers: { user_id: string; body: string }[];
  tallyCounts: Record<string, number>;
  myUserId: string;
  photoBase: string;
}

const PHASE_SECONDS = 60;

export default function BlindDateHost({
  eventId,
  eventStatus: initialStatus,
  tokenCost,
  suitors: initialSuitors,
  round: initialRound,
  answers: initialAnswers,
  tallyCounts: initialCounts,
  myUserId,
  photoBase
}: BlindDateHostProps) {
  const supabase = createClient();
  const [eventStatus, setEventStatus] = useState(initialStatus);
  const [suitors, setSuitors] = useState(initialSuitors);
  const [round, setRound] = useState<RoundRow | null>(initialRound);
  const [answers, setAnswers] = useState(initialAnswers);
  const [counts, setCounts] = useState(initialCounts);
  const [now, setNow] = useState(Date.now());
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const knownRef = useRef(new Set(initialSuitors.map((s) => s.userId)));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const [{ data: ev }, { data: rounds }, { data: entries }] =
        await Promise.all([
          supabase
            .from('events')
            .select('status')
            .eq('id', eventId)
            .maybeSingle(),
          supabase
            .from('blind_date_rounds')
            .select('*')
            .eq('event_id', eventId)
            .order('round_index'),
          supabase
            .from('event_entries')
            .select('user_id')
            .eq('event_id', eventId)
            .eq('status', 'reserved')
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
        const { data: ans } = await supabase
          .from('blind_date_answers')
          .select('user_id, body')
          .eq('round_id', current.id);
        if (alive) setAnswers((ans ?? []) as { user_id: string; body: string }[]);
      }

      // New suitors join live — pull their profiles when the roster grows.
      const ids = new Set((entries ?? []).map((e) => e.user_id));
      const fresh = Array.from(ids).filter((id) => !knownRef.current.has(id));
      if (fresh.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', fresh)
          .filter('photos.held_at', 'is', 'null');
        if (alive && profiles) {
          const map = new Map(
            profiles.map((p) => [
              p.id,
              {
                displayName: p.display_name,
                photo:
                  p.photos?.find((ph) => ph.is_primary)?.storage_path ??
                  p.photos?.[0]?.storage_path ??
                  null
              }
            ])
          );
          fresh.forEach((id) => knownRef.current.add(id));
          setSuitors((prev) => [
            ...prev,
            ...fresh.map((id) => ({
              userId: id,
              displayName: map.get(id)?.displayName ?? null,
              photo: map.get(id)?.photo ?? null
            }))
          ]);
        }
      }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, initialStatus, initialSuitors]);

  // When the room closes, find the match so the host can jump to the chat.
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
        <p className="text-club text-4xl">🚪</p>
        <h2 className="font-header text-cyan mt-3 text-xl">The room closed.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-club">
          It didn&apos;t fill in time (or the room failed), so everyone&apos;s tokens
          were returned. The door stays open — you can host again whenever
          you&apos;re ready.
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
    const winner = suitors.find((s) => s.userId === top?.[0]) ?? null;
    return (
      <div className="rounded-xl border border-gold/40 bg-zinc-900/50 p-6 text-center">
        <p className="text-club text-4xl">💘</p>
        <h2 className="font-header text-cyan mt-3 text-2xl">The room is done.</h2>
        {winner ? (
          <>
            <p className="mx-auto mt-2 max-w-md text-sm text-club">
              Your winner, with {top[1]} mark{top[1] === 1 ? '' : 's'} —{' '}
              <span className="font-bold text-gold">{winner.displayName ?? 'your date'}</span>.
              The rest of the room paid for the chance, that&apos;s on their
              answers.
            </p>
            {matchId && (
              <Link
                href={`/messages/${matchId}`}
                className="mt-5 inline-block rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton"
              >
                Open your chat →
              </Link>
            )}
          </>
        ) : (
          <p className="mx-auto mt-2 max-w-md text-sm text-club">
            No marks were handed out, so everyone was refunded.
          </p>
        )}
      </div>
    );
  }

  const phase = round?.phase ?? 'question';
  const phaseStart = round
    ? new Date(round.phase_started_at).getTime()
    : Date.now();
  const left = Math.max(0, PHASE_SECONDS - Math.floor((now - phaseStart) / 1000));
  const final = round?.round_index === 4;
  const roundLabel = final ? 'THE FINAL ROUND' : `Round ${(round?.round_index ?? 0) + 1} of 4`;
  const answersByUser = new Map(answers.map((a) => [a.user_id, a.body]));
  const seated = suitors.filter((s) => s.userId !== myUserId);

  const ask = async () => {
    if (!question.trim() || !round || busy) return;
    setBusy(true);
    const res = await submitBlindQuestion(eventId, round.round_index, question.trim());
    setBusy(false);
    if (res.error) setError(res.error);
    else setQuestion('');
  };

  const tally = async (suitorId: string) => {
    if (!round || busy) return;
    setBusy(true);
    const res = await selectBlindTally(eventId, round.round_index, suitorId);
    setBusy(false);
    if (res.error) setError(res.error);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      {/* The stage */}
      <div className="text-center">
        <p
          className={`text-xs font-extrabold uppercase tracking-[0.3em] ${
            final ? 'text-gold' : 'text-club'
          }`}
        >
          {roundLabel}
        </p>
        <p className="mt-1 text-sm text-club">
          {phase === 'question' && 'Ask anything — it goes to all of them.'}
          {phase === 'answer' && 'Their answers land under each face.'}
          {phase === 'selection' && 'Give one mark to the answer you liked best.'}
          {phase === 'done' && 'Round complete — the next round is coming.'}
        </p>
        <div className="mt-2 font-mono text-lg font-bold text-gold">
          {phase === 'done' ? '—' : `${left}s`}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-xs text-club">
          {error}
        </p>
      )}

      {/* The question box (question phase) */}
      {phase === 'question' && (
        <div className="mt-6">
          <label className="text-xs font-bold uppercase tracking-[0.2em] text-cyan">
            Your question — {PHASE_SECONDS} seconds to write it
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Ask them anything — personality decides tonight…"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-white placeholder-zinc-500 focus:border-club focus:outline-none"
          />
          <button
            onClick={ask}
            disabled={busy || !question.trim()}
            className="mt-3 rounded-lg bg-gold px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-gold-royal disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send to all →
          </button>
        </div>
      )}

      {round?.question && phase !== 'question' && (
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-center">
          <p className="text-club text-xs font-bold uppercase tracking-[0.2em]">
            The question
          </p>
          <p className="mt-1 text-sm text-club">“{round.question}”</p>
        </div>
      )}

      {/* The suitors — blurred until you choose */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {seated.map((s) => {
          const count = counts[s.userId] ?? 0;
          return (
            <div
              key={s.userId}
              className={`rounded-xl border p-3 text-center ${
                round?.tally_user_id === s.userId
                  ? 'border-gold bg-gold/10'
                  : 'border-zinc-800 bg-zinc-950/50'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.photo ? `${photoBase}${s.photo}` : '/brand/entrance.webp'}
                alt=""
                className="mx-auto h-20 w-16 rounded-lg object-cover blur-[3px]"
              />
              <p className="mt-2 text-xs font-bold text-club">
                {s.displayName ?? 'Gentleman'}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                <span className="font-mono font-bold text-gold">{count}</span>
                <span className="text-cyan">marks</span>
              </div>
              <div className="mt-2 min-h-[3rem] rounded-md bg-zinc-900 px-2 py-1.5 text-left text-xs text-cyan">
                {answersByUser.get(s.userId) ?? (
                  <span className="text-zinc-500">no answer yet</span>
                )}
              </div>
              {phase === 'selection' && (
                <button
                  onClick={() => tally(s.userId)}
                  disabled={busy || round?.tally_user_id != null}
                  className="mt-2 w-full rounded-md bg-gold px-2 py-1.5 text-xs font-extrabold text-black transition hover:bg-gold-royal disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {round?.tally_user_id === s.userId ? '✓ Your mark' : 'Give the mark'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-club">
        The seat costs {tokenCost} tokens for them — you host free. Most marks
        at the end wins the date.
      </p>
    </div>
  );
}
