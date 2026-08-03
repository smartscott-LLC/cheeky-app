'use client';

import { useEffect, useRef, useState } from 'react';

export interface CastCharacter {
  slug: string;
  name: string;
  role: string;
  tagline: string | null;
  portrait_path: string | null;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const TYPING = ['talking', 'thinking', 'pouring'];

/**
 * A full-page chat with one cast member. Streams replies from /api/agent —
 * the same engine the concierge uses, so the voice is identical wherever
 * you meet them.
 */
export default function CastChat({ character }: { character: CastCharacter }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTypingIdx((i) => (i + 1) % TYPING.length), 800);
    return () => clearInterval(t);
  }, [busy]);

  const send = async () => {
    const body = input.trim();
    if (!body || busy) return;
    const history: ChatMsg[] = [...messages, { role: 'user', content: body }];
    setMessages(history);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: character.slug,
          message: body,
          history: messages
        })
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Could not reach the club. Try again.');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: reply }]);
      }
      if (!reply.trim()) {
        setError('The character said nothing. Try again.');
      }
    } catch {
      setError('The line went dead. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      {/* The character — portrait avatar, like the marquee */}
      <div className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-gold/60 bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              character.portrait_path
                ? `/${character.portrait_path}`
                : undefined
            }
            alt={character.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-lg font-extrabold">{character.name}</p>
          <p className="text-sm text-zinc-500">{character.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex h-[52vh] min-h-[320px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 && (
            <p className="pt-8 text-center text-sm text-zinc-500">
              {character.tagline ?? `Talk to ${character.name}.`}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-club text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && <p className="text-sm text-zinc-500">{TYPING[typingIdx]}…</p>}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="border-t border-zinc-800 px-4 py-2 text-xs text-club">
            {error}
          </p>
        )}

        {/* Composer */}
        <div className="flex gap-2 border-t border-zinc-800 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Say something to ${character.name}…`}
            className="flex-1 rounded-lg bg-zinc-800 p-2.5 text-sm text-white outline-none ring-club/50 focus:ring-2"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-lg bg-club px-4 py-2 text-sm font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
