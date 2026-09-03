'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  addSpecialInterest,
  blockUser,
  reportUser,
  resolveSong,
  sendEventMessage,
  sendMessage
} from '@/app/messages/actions';
import { startDateNight } from '@/app/date-night/actions';
import DateNightPanel from '@/components/ui/DateNight/DateNightPanel';
import { startDJ, toggleDJ, unlockDJ } from '@/utils/audio/dj';

interface Message {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
}

interface MessageThreadProps {
  conversationId: string;
  other: {
    id: string;
    display_name: string;
    verified_at: string | null;
    primaryPhoto: string | null;
  };
  initialMessages: Message[];
  blocked: boolean;
  songMode?: boolean;
  matchId?: string | null;
  songEndsAt?: number | null;
  declined?: boolean;
  certificateMode?: boolean;
  hasSpecialInterest?: boolean;
  interestUserId?: string | null;
  giftRoomMode?: boolean;
  giftFloor?: string | null;
  giftExpiresAt?: number | null;
  photoBase: string;
  currentUserId: string;
}

const REPORT_REASONS = [
  'Harassment',
  'Explicit content',
  'Scam or solicitation',
  'Impersonation',
  'Something else'
];

const ICEBREAKERS = [
  'Go-to dance move?',
  'What song are you hoping for right now?',
  'Two truths and a lie — go.',
  'Best date you have ever been on?',
  'Coffee or cocktails?',
  'What is your go-to karaoke pick?',
  'Something you are weirdly good at?'
];

const SONG_SECONDS = 180;

function describeError(code: string): string {
  switch (code) {
    case 'daily_message_limit':
      return "You've used your 30 free messages for today — Gold gets 75, Platinum and Diamond are unlimited.";
    case 'daily_people_limit':
      return "You've reached your new-conversation limit for today. Your matches are always open.";
    case 'blocked':
      return 'This conversation is blocked.';
    case 'conversation_closed':
      return 'This conversation is closed. No follow-ups — respect the floor.';
    case 'certificate_required':
      return 'You need a Speed Dating certificate with this person first.';
    case 'match_required':
      return 'Date Night is for matches — you two need to match first.';
    case 'not_a_participant':
      return 'You are not part of this conversation.';
    default:
      return 'Message could not be sent. Try again.';
  }
}

export default function MessageThread({
  conversationId,
  other,
  initialMessages,
  blocked: initiallyBlocked,
  songMode: initialSongMode = false,
  matchId = null,
  songEndsAt = null,
  declined: initiallyDeclined = false,
  certificateMode = false,
  hasSpecialInterest = false,
  interestUserId = null,
  giftRoomMode = false,
  giftFloor = null,
  giftExpiresAt = null,
  photoBase,
  currentUserId
}: MessageThreadProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [songMode, setSongMode] = useState(initialSongMode);
  const [songOver, setSongOver] = useState(false);
  const [declined, setDeclined] = useState(initiallyDeclined);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [interestAdded, setInterestAdded] = useState(hasSpecialInterest);
  const [interestBusy, setInterestBusy] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [djMuted, setDjMuted] = useState(false);
  const [dateNightGame, setDateNightGame] = useState<string | null>(null);
  const [dateNightBusy, setDateNightBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) setMessages(data as Message[]);
  };

  useEffect(() => {
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // The DJ keeps spinning through the song.
  useEffect(() => {
    if (songMode) {
      unlockDJ();
      startDJ();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songMode]);

  // Song countdown.
  useEffect(() => {
    if (!songMode || !songEndsAt) return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.floor((songEndsAt - Date.now()) / 1000));
      setNow(Date.now());
      if (left === 0) {
        setSongMode(false);
        setSongOver(true);
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [songMode, songEndsAt]);

  const songLeft = songEndsAt
    ? Math.max(0, Math.floor((songEndsAt - now) / 1000))
    : 0;

  const handleSend = async () => {
    const body = input.trim();
    if (!body) return;
    setError(null);
    const res = songMode
      ? await sendEventMessage(conversationId, body)
      : await sendMessage(conversationId, body);
    if (res.error) {
      setError(describeError(res.error));
      return;
    }
    setInput('');
    await refresh();
  };

  const handleDateNight = async () => {
    if (!matchId) return;
    setDateNightBusy(true);
    const res = await startDateNight(other.id);
    setDateNightBusy(false);
    if (res.error) {
      setError(describeError(res.error));
      return;
    }
    if (res.gameId) {
      setDateNightGame(res.gameId);
    }
  };

  const handleAddInterest = async () => {
    if (!interestUserId) return;
    setInterestBusy(true);
    const res = await addSpecialInterest(interestUserId);
    setInterestBusy(false);
    if (res.error) {
      setError(describeError(res.error));
      return;
    }
    setInterestAdded(true);
  };

  const handleResolve = async (keepGoing: boolean) => {
    if (!matchId) return;
    setBusy(true);
    const res = await resolveSong(matchId, keepGoing);
    setBusy(false);
    if (res.error) {
      setError(describeError(res.error));
      return;
    }
    if (keepGoing) {
      setSongOver(false);
      setError(null);
    } else {
      setDeclined(true);
    }
  };

  return (
    <div
      className={`flex h-[70vh] flex-col overflow-hidden rounded-xl border bg-zinc-900/50 ${
        certificateMode ? 'border-platinum/30' : 'border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Link
            href="/browse"
            className="text-sm font-semibold text-cyan hover:text-white"
          >
            ← The floor
          </Link>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-800">
            {other.primaryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${photoBase}${other.primaryPhoto}`}
                alt={other.display_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-bold text-cyan">
                {other.display_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-body text-club font-bold">{other.display_name}</p>
            {other.verified_at && (
              <p className="text-sm font-bold uppercase tracking-wide font-body text-club">
                Verified
              </p>
            )}
            {certificateMode && (
              <p className="font-body text-club text-sm font-bold uppercase tracking-wide">
                💎 Certificate match
              </p>
            )}
            {songMode && (
              <p className="text-sm font-bold font-body text-club">
                🎵 Dancing — {Math.floor(songLeft / 60)}:
                {String(songLeft % 60).padStart(2, '0')}
              </p>
            )}
            {declined && (
              <p className="text-sm font-body text-club">Song over — chat closed</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {matchId && !blocked && !declined && !dateNightGame && (
            <button
              onClick={handleDateNight}
              disabled={dateNightBusy}
              className="rounded-md border border-club/50 px-3 py-1.5 text-xs font-semibold font-body text-club transition hover:bg-club/10"
            >
              {dateNightBusy ? '…' : '💘 Date Night'}
            </button>
          )}
          {songMode && (
            <button
              onClick={() => setDjMuted(toggleDJ())}
              title="DJ"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-cyan hover:border-zinc-500"
            >
              {djMuted ? '🔇' : '🎧'}
            </button>
          )}
          {!blocked && !declined && (
            <button
              onClick={() => setReportOpen((v) => !v)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-cyan hover:border-zinc-500"
            >
              Report
            </button>
          )}
          {!blocked && !declined && (
            <button
              onClick={async () => {
                if (
                  confirm(
                    `Block ${other.display_name}? You'll stop seeing each other.`
                  )
                ) {
                  await blockUser(other.id);
                  setBlocked(true);
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-cyan hover:border-club/60 hover:font-body text-club"
            >
              Block
            </button>
          )}
        </div>
      </div>

      {/* Gift room — accepted gift = a 2-hour date in a decorated room. */}
      {giftRoomMode && (
        <div className="border-b border-gold/20 bg-gradient-to-r from-gold/20 via-zinc-900 to-club/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-body text-club text-base font-bold">🍾 A Gift Date</p>
              <p className="text-sm font-body text-club">
                This room is yours for the next two hours
                {giftFloor && giftFloor !== 'standard' && giftFloor !== 'silver'
                  ? ` — explore the ${giftFloor} floor together`
                  : ' — make it count'}
                .
              </p>
            </div>
            <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
              💝 Special delivery
            </span>
          </div>
        </div>
      )}

      {/* Certificate room — the Speed Dating reward skin (permanent). */}
      {certificateMode && (
        <div className="border-b border-platinum/20 bg-platinum-navy px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-body text-club text-base font-bold">
                💎 Speed Dating Certificate Match
              </p>
              <p className="text-sm font-body text-club">
                You two picked each other on the Speed Dating floor — this chat
                is certified. No one else gets this room.
              </p>
            </div>
            {interestAdded ? (
              <span className="rounded-full border border-platinum/40 bg-platinum/10 px-3 py-1 text-sm font-semibold text-platinum-alice">
                ⭐ On your special interests
              </span>
            ) : (
              <button
                onClick={handleAddInterest}
                disabled={interestBusy}
                className="rounded-full bg-platinum px-3 py-1 text-xs font-bold text-platinum-navy transition hover:bg-platinum-alice"
              >
                ⭐ Add to special interests
              </button>
            )}
          </div>
        </div>
      )}

      {/* Icebreakers during the song */}
      {songMode && (
        <div className="flex items-center gap-3 border-b border-zinc-800 bg-club/10 px-4 py-2">
          <p className="text-base font-semibold font-body text-club">
            💬 {ICEBREAKERS[promptIdx]}
          </p>
          <button
            onClick={() => setPromptIdx((i) => (i + 1) % ICEBREAKERS.length)}
            className="ml-auto rounded-full border border-zinc-700 px-3 py-1 text-xs text-cyan hover:border-club hover:font-body text-club"
          >
            Another
          </button>
        </div>
      )}

      {/* Post-song decision */}
      {songOver && !declined && !blocked && (
        <div className="border-b border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="font-body text-club text-base font-bold">The song&apos;s over. What now?</p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              onClick={() => handleResolve(true)}
              disabled={busy}
              className="rounded-lg bg-club px-5 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
            >
              Keep dancing — it&apos;s a match
            </button>
            <button
              onClick={() => handleResolve(false)}
              disabled={busy}
              className="rounded-lg border border-zinc-700 px-5 py-2 text-sm font-semibold text-cyan hover:border-zinc-500"
            >
              Move on — close it
            </button>
          </div>
        </div>
      )}

      {declined && (
        <p className="border-b border-zinc-800 px-4 py-2 text-center text-sm font-body text-club">
          The song is over and the chat is closed. No follow-ups — that&apos;s
          the rule of the floor.
        </p>
      )}

      {reportOpen && !blocked && !declined && (
        <div className="border-b border-zinc-800 bg-zinc-900 p-4">
          <p className="font-body text-club mb-2 text-base font-bold">Report {other.display_name}</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={async () => {
                  const res = await reportUser(
                    other.id,
                    reason,
                    conversationId
                  );
                  if (res?.error) {
                    setReportError(res.error);
                    return;
                  }
                  setReportError(null);
                  setReported(true);
                  setReportOpen(false);
                }}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-cyan hover:border-club hover:font-body text-club"
              >
                {reason}
              </button>
            ))}
          </div>
          {reportError && (
            <p className="mt-2 text-sm text-amber-400">{reportError}</p>
          )}
        </div>
      )}

      {reported && (
        <p className="border-b border-zinc-800 px-4 py-2 text-sm font-body text-club">
          Report filed. A human bouncer will review it.
        </p>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center font-body text-club">
            {blocked
              ? 'This conversation is blocked.'
              : songMode
                ? 'The song is yours. Say something.'
                : 'The floor is yours. Say something.'}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-base ${
                  mine ? 'bg-club text-white' : 'bg-zinc-800 text-cyan'
                }`}
              >
                <p>{m.body}</p>
                <p
                  className={`mt-1 text-[12px] ${
                    mine ? 'text-white/60' : 'text-cyan'
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Date Night panel — the couple game lives above the composer. */}
      {dateNightGame && (
        <div className="border-t border-zinc-800 p-3">
          <DateNightPanel
            gameId={dateNightGame}
            otherName={other.display_name}
            onClose={() => setDateNightGame(null)}
          />
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-zinc-800 p-4">
        {error && <p className="mb-2 text-sm font-body text-club">{error}</p>}
        {blocked ? (
          <p className="text-base font-body text-club">Blocked. No more messages.</p>
        ) : declined ? (
          <Link
            href="/events"
            className="inline-block rounded-lg bg-club px-5 py-2 text-base font-bold text-white transition hover:bg-club-cotton"
          >
            Back to the Dance Floor
          </Link>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                songMode ? 'Say it while the song plays…' : 'Say something…'
              }
              className="flex-1 rounded-lg bg-zinc-800 p-3 text-base text-white outline-none ring-club/50 focus:ring-2"
            />
            <button
              onClick={handleSend}
              className="rounded-lg bg-club px-5 py-2 font-bold text-white transition hover:bg-club-cotton"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
