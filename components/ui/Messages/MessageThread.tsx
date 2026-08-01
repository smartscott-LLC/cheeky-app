'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { blockUser, reportUser, sendMessage } from '@/app/messages/actions';

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

function describeError(code: string): string {
  switch (code) {
    case 'daily_message_limit':
      return "You've used your 30 free messages for today — Gold gets 75, Platinum and Diamond are unlimited.";
    case 'daily_people_limit':
      return "You've reached your new-conversation limit for today. Your matches are always open.";
    case 'blocked':
      return 'This conversation is blocked.';
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
  photoBase,
  currentUserId
}: MessageThreadProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
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

  const handleSend = async () => {
    const body = input.trim();
    if (!body) return;
    setError(null);
    const res = await sendMessage(conversationId, body);
    if (res.error) {
      setError(describeError(res.error));
      return;
    }
    setInput('');
    await refresh();
  };

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Link
            href="/browse"
            className="text-xs font-semibold text-zinc-500 hover:text-white"
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
              <span className="font-bold text-zinc-500">
                {other.display_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-bold">{other.display_name}</p>
            {other.verified_at && (
              <p className="text-xs font-bold uppercase tracking-wide text-club">
                Verified
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!blocked && (
            <button
              onClick={() => setReportOpen((v) => !v)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
            >
              Report
            </button>
          )}
          {!blocked && (
            <button
              onClick={async () => {
                if (confirm(`Block ${other.display_name}? You'll stop seeing each other.`)) {
                  await blockUser(other.id);
                  setBlocked(true);
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-club/60 hover:text-club"
            >
              Block
            </button>
          )}
        </div>
      </div>

      {reportOpen && !blocked && (
        <div className="border-b border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-2 text-sm font-bold">Report {other.display_name}</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={async () => {
                  await reportUser(other.id, reason, conversationId);
                  setReported(true);
                  setReportOpen(false);
                }}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-club hover:text-club"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}

      {reported && (
        <p className="border-b border-zinc-800 px-4 py-2 text-xs text-club">
          Report filed. A human bouncer will review it.
        </p>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-zinc-500">
            {blocked
              ? 'This conversation is blocked.'
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
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? 'bg-club text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <p>{m.body}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    mine ? 'text-white/60' : 'text-zinc-500'
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

      {/* Composer */}
      <div className="border-t border-zinc-800 p-4">
        {error && <p className="mb-2 text-xs text-club">{error}</p>}
        {blocked ? (
          <p className="text-sm text-zinc-500">Blocked. No more messages.</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Say something…"
              className="flex-1 rounded-lg bg-zinc-800 p-3 text-sm text-white outline-none ring-club/50 focus:ring-2"
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
