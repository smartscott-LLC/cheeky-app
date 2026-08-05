'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  joinEvent,
  selectSpeedRank,
  sendSpeedMessage
} from '@/app/events/actions';

interface Participant {
  userId: string;
  status: string;
  groupNumber: number | null;
  profile: {
    display_name: string | null;
    verified_at: string | null;
    photo: string | null;
  } | null;
}

interface SpeedDatingFloorProps {
  event: {
    id: string;
    status: string;
    startsAt: string;
    tokenCost: number;
    minFill: number;
  };
  participants: Participant[];
  myEntry: { status: string; groupNumber: number | null } | null;
  sessions: { slot_index: number; user_a: string; user_b: string }[];
  myUserId: string;
  photoBase: string;
}

const SESSION_SECONDS = 90;
const ICEBREAKERS = [
  'What do you do when the weekend hits?',
  'Go-to order at a bar?',
  'What is your favorite travel memory?',
  'Pets: yes or no?',
  'What are you weirdly good at?'
];

interface SessionMessage {
  sender_id: string;
  body: string;
  created_at: string;
}

export default function SpeedDatingFloor({
  event,
  participants: initialParticipants,
  myEntry: initialEntry,
  sessions: initialSessions,
  myUserId,
  photoBase
}: SpeedDatingFloorProps) {
  const supabase = createClient();
  const [participants, setParticipants] = useState(initialParticipants);
  const [myEntry, setMyEntry] = useState(initialEntry);
  const [sessions, setSessions] = useState(initialSessions);
  const [eventStatus, setEventStatus] = useState(event.status);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [topPick, setTopPick] = useState<string | null>(null);
  const [altPick, setAltPick] = useState<string | null>(null);
  const [result, setResult] = useState<{
    matchedName: string | null;
    conversationId: string | null;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const startsAt = new Date(event.startsAt).getTime();
  const maxSlot =
    sessions.length > 0 ? sessions[sessions.length - 1].slot_index : 0;
  const rotationMs = (maxSlot + 1) * SESSION_SECONDS * 1000;
  const rotationEnds = startsAt + rotationMs;
  const slotIndex = Math.min(
    maxSlot,
    Math.max(0, Math.floor((Date.now() - startsAt) / (SESSION_SECONDS * 1000)))
  );
  const inRotation = eventStatus === 'running' && now < rotationEnds;
  const selectionPhase =
    (eventStatus === 'closed' || now >= rotationEnds) && !result;

  const currentSession = sessions.find((s) => s.slot_index === slotIndex);
  const partnerId = currentSession
    ? currentSession.user_a === myUserId
      ? currentSession.user_b
      : currentSession.user_a
    : null;
  const partner = participants.find((p) => p.userId === partnerId) ?? null;
  const group = participants.filter(
    (p) => p.groupNumber === myEntry?.groupNumber && p.userId !== myUserId
  );

  const joined = Boolean(
    myEntry && myEntry.status !== 'released' && myEntry.status !== 'canceled'
  );

  const refresh = async () => {
    const [{ data: ev }, { data: entries }, { data: sess }, { data: certs }] =
      await Promise.all([
        supabase
          .from('events')
          .select('status')
          .eq('id', event.id)
          .maybeSingle(),
        supabase
          .from('event_entries')
          .select('user_id, status, group_number')
          .eq('event_id', event.id),
        supabase
          .from('speed_sessions')
          .select('slot_index, user_a, user_b')
          .eq('event_id', event.id)
          .order('slot_index'),
        supabase
          .from('certificates')
          .select('id, match_id')
          .eq('user_id', myUserId)
          .limit(5)
      ]);

    if (ev?.status) setEventStatus(ev.status);
    setSessions((sess ?? []).map((s) => ({ ...s })));

    // entries → profiles for the group display
    const ids = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } =
      ids.length > 0
        ? await supabase
            .from('profiles')
            .select(
              'id, display_name, verified_at, photos(storage_path, is_primary)'
            )
            .in('id', ids)
        : { data: [] };
    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          display_name: p.display_name,
          verified_at: p.verified_at,
          photo:
            p.photos?.find((ph) => ph.is_primary)?.storage_path ??
            p.photos?.[0]?.storage_path ??
            null
        }
      ])
    );
    setParticipants(
      (entries ?? []).map((e) => ({
        userId: e.user_id,
        status: e.status,
        groupNumber: e.group_number,
        profile: profileMap.get(e.user_id) ?? null
      }))
    );
    const rawEntry =
      (entries ?? []).find((e) => e.user_id === myUserId) ?? null;
    setMyEntry(
      rawEntry
        ? { status: rawEntry.status, groupNumber: rawEntry.group_number }
        : null
    );

    // certificates → result
    if ((certs ?? []).length > 0 && !result) {
      const cert = certs![0];
      const { data: match } = await supabase
        .from('matches')
        .select('user_id_a, user_id_b')
        .eq('id', cert.match_id ?? '')
        .maybeSingle();
      const otherId = match
        ? match.user_id_a === myUserId
          ? match.user_id_b
          : match.user_id_a
        : null;
      const other = otherId
        ? participants.find((p) => p.userId === otherId)?.profile
        : null;

      // The real conversation created at resolution.
      let conversationId: string | null = null;
      if (otherId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .or(
            `and(user_id_a.eq.${myUserId},user_id_b.eq.${otherId}),and(user_id_a.eq.${otherId},user_id_b.eq.${myUserId})`
          )
          .maybeSingle();
        conversationId = conv?.id ?? null;
      }

      setResult({
        matchedName: other?.display_name ?? null,
        conversationId
      });
    }
  };

  const refreshMessages = async () => {
    if (!currentSession) return;
    const { data } = await supabase
      .from('speed_session_messages')
      .select('sender_id, body, created_at')
      .eq('event_id', event.id)
      .eq('group_number', myEntry?.groupNumber ?? -1)
      .eq('slot_index', currentSession.slot_index)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as SessionMessage[]);
  };

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      refresh();
      refreshMessages();
    }, 2000);
    const clock = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, myEntry?.groupNumber, currentSession?.slot_index]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    const res = await joinEvent(event.id);
    setBusy(false);
    if (res.error) {
      setError(
        res.error === 'insufficient_tokens'
          ? 'Not enough tokens. Top up or earn some.'
          : res.error === 'tier_required'
            ? 'Speed Dating is the Platinum floor — get your Platinum card first.'
            : 'Could not join. Try again.'
      );
      return;
    }
    await refresh();
  };

  const handleSend = async () => {
    const body = input.trim();
    if (!body || !currentSession || myEntry?.groupNumber == null) return;
    setError(null);
    const res = await sendSpeedMessage(
      event.id,
      myEntry.groupNumber,
      currentSession.slot_index,
      body
    );
    if (res.error) {
      setError(res.error);
      return;
    }
    setInput('');
    await refreshMessages();
  };

  const handleSelect = async (picked: string, rank: 1 | 2) => {
    setError(null);
    const res = await selectSpeedRank(event.id, rank, picked);
    if (res.error) {
      setError(res.error);
    }
  };

  // ---- render ----
  if (result) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-club/60 bg-zinc-900/80 p-10 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-4 text-3xl font-extrabold">You matched!</h2>
        <p className="mt-3 text-green">
          {result.matchedName
            ? `You and ${result.matchedName} picked each other first.`
            : 'You two picked each other first.'}{' '}
          Your Speed Dating certificate is issued.
        </p>
        {result.conversationId && (
          <Link
            href={`/messages/${result.conversationId}`}
            className="mt-6 inline-block rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton"
          >
            Open your private chat
          </Link>
        )}
      </div>
    );
  }

  const sessionLeft = Math.max(
    0,
    Math.ceil(
      (startsAt + (slotIndex + 1) * SESSION_SECONDS * 1000 - now) / 1000
    )
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
          {eventStatus === 'running'
            ? selectionPhase
              ? 'Choose your pick'
              : 'Rotating now'
            : eventStatus === 'closed'
              ? 'Picking time'
              : eventStatus === 'canceled'
                ? 'Done'
                : 'Doors open'}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold">
          {!joined
            ? 'Speed Dating — 25 tokens'
            : selectionPhase
              ? 'Who would you pick again?'
              : `Session ${slotIndex + 1} of ${maxSlot + 1}`}
        </h2>
        <p className="mt-1 text-green">
          {!joined
            ? `Entry is ${event.tokenCost} tokens (reserved — back if no match). Platinum floor.`
            : selectionPhase
              ? 'Top pick + one alternate. Mutual top picks match.'
              : `90 seconds each. ${sessionLeft}s left.`}
        </p>
        <div className="mt-4 flex justify-center">
          {!joined && eventStatus === 'open' && (
            <button
              onClick={handleJoin}
              disabled={busy}
              className="rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton"
            >
              {busy ? 'Checking…' : `Join for ${event.tokenCost} tokens`}
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-club">{error}</p>}
      </div>

      {/* Rotation: current partner + chat */}
      {joined && !selectionPhase && partner && (
        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4 border-b border-zinc-800 p-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-zinc-800">
              {partner.profile?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${photoBase}${partner.profile.photo}`}
                  alt={partner.profile.display_name || ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold text-green">
                  {(partner.profile?.display_name || '?').charAt(0)}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold">
                {partner.profile?.display_name || 'Member'}
              </p>
              {partner.profile?.verified_at && (
                <p className="text-xs font-bold uppercase tracking-wide text-club">
                  Verified
                </p>
              )}
            </div>
            <p className="ml-auto text-sm font-bold text-club">
              {ICEBREAKERS[slotIndex % ICEBREAKERS.length]}
            </p>
          </div>
          <div className="h-48 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="pt-14 text-center text-green">
                Ninety seconds — make it memorable.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.sender_id === myUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                    m.sender_id === myUserId
                      ? 'bg-club text-white'
                      : 'bg-zinc-800 text-green'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t border-zinc-800 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Say something…"
              className="flex-1 rounded-lg bg-zinc-800 p-2.5 text-sm outline-none ring-club/50 focus:ring-2"
            />
            <button
              onClick={handleSend}
              className="rounded-lg bg-club px-4 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Selection phase */}
      {joined && selectionPhase && (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-green">
            Pick your top choice and one alternate from your group. Mutual top
            picks get the certificate.
          </p>
          <div className="mt-4 space-y-2">
            {group.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3"
              >
                <span className="font-bold">
                  {p.profile?.display_name || 'Member'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTopPick(p.userId);
                      handleSelect(p.userId, 1);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-bold ${
                      topPick === p.userId
                        ? 'bg-club text-white'
                        : 'border border-zinc-700 text-green'
                    }`}
                  >
                    Top pick
                  </button>
                  <button
                    onClick={() => {
                      setAltPick(p.userId);
                      handleSelect(p.userId, 2);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-bold ${
                      altPick === p.userId
                        ? 'bg-zinc-200 text-black'
                        : 'border border-zinc-700 text-green'
                    }`}
                  >
                    Alternate
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-green">
            Results land when the room closes — we&apos;ll announce the matches.
          </p>
        </div>
      )}

      {/* Waiting for the room */}
      {joined && !selectionPhase && !partner && eventStatus === 'running' && (
        <p className="mt-10 text-center text-green">
          Finding your next seat…
        </p>
      )}
    </div>
  );
}
