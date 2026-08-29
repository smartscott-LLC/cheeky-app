'use client';

import { useEffect, useRef, useState } from 'react';
import type { Channel, StreamChat } from 'stream-chat';

interface Props {
  channelId: string;
  otherName: string;
  meId: string;
  client: StreamChat | null;
  onBack: () => void;
}

interface WhisperMsg {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: string;
}

/**
 * Whisper subview — an ephemeral 1:1 channel between two members.
 * Slide-in animation, typing indicator, real-time message delivery.
 */
export default function StreamChatWhisper({
  channelId,
  otherName,
  meId,
  client,
  onBack
}: Props) {
  const [messages, setMessages] = useState<WhisperMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!client) return;
    const ch = client.channel('messaging', channelId);
    channelRef.current = ch;
    let mounted = true;
    (async () => {
      try {
        await ch.watch();
      } catch {
        // ignore
      }
      if (!mounted) return;
      const stateMessages = (ch.state.messages as unknown as Array<{
        id: string;
        text: string;
        user?: { id: string; name?: string };
        created_at?: string;
      }>);
      setMessages(
        stateMessages.map((m) => ({
          id: m.id,
          text: m.text,
          userId: m.user?.id ?? '',
          userName: m.user?.name ?? 'Member',
          createdAt: (m.created_at as string) ?? new Date().toISOString()
        }))
      );
      ch.on('message.new', (event) => {
        const m = event.message as
          | {
              id: string;
              text: string;
              user?: { id: string; name?: string };
              created_at?: string;
            }
          | undefined;
        if (!m) return;
        setMessages((prev) => [
          ...prev,
          {
            id: m.id,
            text: m.text,
            userId: m.user?.id ?? '',
            userName: m.user?.name ?? 'Member',
            createdAt:
              (m.created_at as string) ?? new Date().toISOString()
          }
        ]);
      });
      ch.on('typing.start', (event) => {
        if (event.user?.id && event.user.id !== meId) setTyping(true);
      });
      ch.on('typing.stop', (event) => {
        if (event.user?.id && event.user.id !== meId) setTyping(false);
      });
    })();
    return () => {
      mounted = false;
      try {
        ch.stopWatching();
      } catch {
        // ignore
      }
    };
  }, [channelId, client, meId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || !client) return;
    setSending(true);
    setError(null);
    try {
      await channelRef.current?.sendMessage({
        text: body,
        user_id: meId
      } as unknown as Parameters<Channel['sendMessage']>[0]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'send_failed');
    } finally {
      setSending(false);
    }
  };

  const onChange = (value: string) => {
    setDraft(value);
    if (!channelRef.current) return;
    if (value && !sending) {
      channelRef.current.keystroke().catch(() => undefined);
    } else {
      channelRef.current.stopTyping().catch(() => undefined);
    }
  };

  return (
    <div className="flex h-full flex-col animate-[slideIn_0.2s_ease-out]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <button
          onClick={onBack}
          className="rounded px-1 py-0.5 text-sm text-cyan transition hover:bg-zinc-800"
        >
          ← Rooms
        </button>
        <p className="font-header text-cyan text-base">
          🤫 Whisper · {otherName}
        </p>
        <span className="w-10" />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-sm text-club">
            Just the two of you — whispers stay here.
          </p>
        )}
        {messages.map((m, idx) => {
          const isMe = m.userId === meId;
          // Stagger animation by index — subtle, low cost.
          const delay = idx < 5 ? `${idx * 40}ms` : '0ms';
          return (
            <div
              key={m.id}
              style={{ animationDelay: delay }}
              className={`max-w-[85%] animate-[fadeIn_0.2s_ease-out] rounded-lg px-3 py-1.5 text-sm ${
                isMe
                  ? 'ml-auto bg-cyan text-black'
                  : 'mr-auto bg-zinc-800 text-white'
              }`}
            >
              {m.text}
            </div>
          );
        })}
        {typing && (
          <p className="text-xs italic text-zinc-500">{otherName} is typing…</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-800 p-2">
        {error && <p className="mb-1 px-1 text-xs text-club">{error}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => onChange(e.target.value)}
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
