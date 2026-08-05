'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { tapDateNight } from '@/app/date-night/actions';
import posthog from 'posthog-js';

const ROUND_SECONDS = 30;

interface GameState {
  id: string;
  status: string;
  current_index: number;
  total: number;
  score: number;
  results: { i: number; correct: boolean; missed?: boolean }[];
  question_started_at: string;
  finished_at: string | null;
  pack_id: string;
  question_id: string;
}

interface DateNightPanelProps {
  gameId: string;
  otherName: string;
  onClose: () => void;
}

export default function DateNightPanel({
  gameId,
  otherName,
  onClose
}: DateNightPanelProps) {
  const supabase = createClient();
  const [state, setState] = useState<GameState | null>(null);
  const [myPick, setMyPick] = useState<number | null>(null);
  const [partnerPicked, setPartnerPicked] = useState(false);
  const [question, setQuestion] = useState<{
    prompt: string;
    options: string[];
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [leaderboard, setLeaderboard] = useState<number[]>([]);
  const [timedOut, setTimedOut] = useState(false);

  const poll = useCallback(async () => {
    const { data } = await supabase.rpc('date_night_state', {
      p_game: gameId
    });
    if (data) {
      const d = data as unknown as {
        game: GameState;
        my_pick: number | null;
        partner_picked: boolean;
      };
      setState(d.game);
      setMyPick(d.my_pick);
      setPartnerPicked(Boolean(d.partner_picked));
      setTimedOut(false);
    }
  }, [gameId, supabase]);

  // Fetch the live question whenever it changes.
  useEffect(() => {
    if (!state?.question_id) return;
    supabase
      .from('trivia_questions')
      .select('prompt, options')
      .eq('id', state.question_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setQuestion(data as { prompt: string; options: string[] });
      });
  }, [state?.question_id, supabase]);

  // Poll the game + keep a local clock.
  useEffect(() => {
    poll();
    const t = setInterval(poll, 2000);
    const clock = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
  }, [poll]);

  // On finish, pull the couples leaderboard for this pack (scores only).
  useEffect(() => {
    if (state?.status === 'finished' && state.pack_id) {
      supabase
        .rpc('date_night_leaderboard', { p_pack: state.pack_id })
        .then(({ data }) => {
          if (data) setLeaderboard(data.map((r) => r.score));
        });
    }
  }, [state?.status, state?.pack_id, supabase]);

  const live = state !== null && state.status === 'active';
  const endsAt = state?.question_started_at
    ? new Date(state.question_started_at).getTime() + ROUND_SECONDS * 1000
    : 0;
  const left = live ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;

  // Timeout: nobody locked it — skip the question (server closes it as missed).
  useEffect(() => {
    if (!live || left > 0 || timedOut || !state) return;
    setTimedOut(true);
    tapDateNight(gameId, state.current_index, null);
  }, [live, left, timedOut, gameId, state]);

  const handleTap = async (idx: number) => {
    if (!live || !state) return;
    const result = await tapDateNight(gameId, state.current_index, idx);
    if (!result.error) posthog.capture('date_night_answer_selected');
    await poll();
  };

  const disagree = live && partnerPicked && myPick !== null && !timedOut;

  // ---- End screen ----
  if (state?.status === 'finished') {
    const beaten = leaderboard.filter((s) => s < state.score).length;
    const total = leaderboard.length;
    return (
      <div className="rounded-xl border border-club/30 bg-gradient-to-b from-club/10 to-zinc-900 p-5 text-center">
        <p className="text-3xl">💘</p>
        <h3 className="mt-2 text-xl font-extrabold">Date Night complete</h3>
        <p className="mt-1 text-cyan">
          {state.score} of {state.total} — you two locked {state.score}{' '}
          {state.score === 1 ? 'answer' : 'answers'} together.
        </p>
        {total > 0 && (
          <p className="mt-1 text-sm text-cyan">
            You beat {beaten} of {total} couples on this pack
            {beaten >= total / 2
              ? ' — the floor noticed. 🏆'
              : ' — keep training.'}
          </p>
        )}
        <p className="mt-3 inline-block rounded-full border border-club/40 bg-club/10 px-3 py-1 text-xs font-bold text-club">
          💘 Date Night badge earned
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-club px-5 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
          >
            Back to the chat
          </button>
        </div>
      </div>
    );
  }

  if (!live || !question || !state) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center text-sm text-cyan">
        Setting the table…
      </div>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="rounded-xl border border-club/30 bg-zinc-900/80 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-club">
          💘 Date Night · {state.current_index + 1}/{state.total}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            left <= 10 ? 'bg-club/20 text-club' : 'bg-zinc-800 text-cyan'
          }`}
        >
          {mm}:{ss}
        </span>
      </div>

      <p className="mt-3 text-sm font-bold text-white">{question.prompt}</p>
      <p className="mt-1 text-xs text-cyan">
        Huddle with {otherName} in the chat — your answer only locks when you
        both pick the same one.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const picked = myPick === i;
          return (
            <button
              key={i}
              onClick={() => handleTap(i)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                picked
                  ? 'border-club bg-club/20 font-bold text-club'
                  : 'border-zinc-700 text-cyan hover:border-club/50'
              }`}
            >
              <span className="mr-2 font-mono text-xs text-cyan">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {myPick === null ? (
          <p className="text-cyan">Pick an answer — then talk it out.</p>
        ) : disagree ? (
          <p className="font-semibold text-gold">
            They picked differently — hash it out in the chat, then re-pick.
          </p>
        ) : partnerPicked ? (
          <p className="text-cyan">
            They&apos;ve picked — match them to lock it.
          </p>
        ) : (
          <p className="text-cyan">
            Your pick is in. Waiting on {otherName}…
          </p>
        )}
        <p className="font-bold text-club">Score: {state.score}</p>
      </div>
    </div>
  );
}
