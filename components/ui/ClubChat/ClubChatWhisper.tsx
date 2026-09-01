'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { loungeWhisperSend } from '@/app/chat/actions';

interface WhisperMsg {
  id: number;
  whisper_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface Props {
  whisperId: string;
  otherName: string;
  meId: string;
  onBack: () => void;
}

/**
 * The whisper subview — an ephemeral pair room. Live via Realtime,
 * scoped to this whisper. No caps; it's a courtesy, not a side-channel
 * (take-private is the match-gated path).
 */
export default function ClubChatWhisper({ whisperId, otherName, meId, onBack }: Props) {
  const [messages, setMessages] = useState<WhisperMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('club_chat_whisper_messages')
      .select('id, whisper_id, sender_id, body, created_at')
      .eq('whisper_id', whisperId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setMessages(data ?? []);
      });

    const ch = supabase
      .channel(`whisper-${whisperId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'club_chat_whisper_messages' },
        (payload) => {
          const row = payload.new as WhisperMsg;
          if (row.whisper_id !== whisperId) return;
          setMessages((prev) => [...prev, row]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [whisperId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await loungeWhisperSend(whisperId, body);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDraft('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <button
          onClick={onBack}
          className="rounded px-1 py-0.5 text-sm text-cyan transition hover:bg-zinc-800"
        >
          ← Rooms
        </button>
        <p className="font-header text-cyan text-base">
          Whisper · {otherName}
        </p>
        <span className="w-10" />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-sm text-club">
            Just the two of you — whispers stay here.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
              m.sender_id === meId
                ? 'ml-auto bg-cyan text-black'
                : 'mr-auto bg-zinc-800 text-white'
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-800 p-2">
        {error && <p className="mb-1 px-1 text-xs text-club">{error}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Whisper…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-cyan"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className="rounded-lg bg-cyan px-4 py-1.5 text-sm font-bold text-black transition hover:opacity-80 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
