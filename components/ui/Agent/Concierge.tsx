'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface CastMember {
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

export default function Concierge() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [active, setActive] = useState<CastMember | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState(0);
  const [unreadMoments, setUnreadMoments] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });
  }, [supabase]);

  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from('characters')
      .select('slug, name, role, tagline, portrait_path')
      .eq('active', true)
      .order('created_at')
      .then(({ data }) => {
        if (data) setCast(data as CastMember[]);
      });
  }, [signedIn, supabase]);

  // Unread character-moment badge on the corner button.
  useEffect(() => {
    if (!signedIn) return;
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('character_moments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('seen_at', null);
      setUnreadMoments(count ?? 0);
    })();
  }, [signedIn, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTypingIdx((i) => (i + 1) % TYPING.length), 800);
    return () => clearInterval(t);
  }, [busy]);

  const togglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Opening the club reads the messages — clear the badge.
      (async () => {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from('character_moments')
          .update({ seen_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('seen_at', null);
        setUnreadMoments(0);
      })();
    }
  };

  const openChat = (member: CastMember) => {
    setActive(member);
    setMessages([]);
    setError(null);
  };

  const backToCast = () => {
    setActive(null);
    setMessages([]);
  };

  const send = async () => {
    const body = input.trim();
    if (!body || busy || !active) return;
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
          character: active.slug,
          message: body,
          history: messages
        })
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Could not reach the club. Try again.');
        return;
      }
      // Stream the reply chunk by chunk.
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

  if (!signedIn) return null;

  return (
    <>
      {/* The corner button */}
      <button
        onClick={togglePanel}
        aria-label="Talk to the club characters"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-club/50 bg-zinc-900 text-2xl shadow-[0_0_20px_rgba(246,5,186,0.4)] transition hover:scale-105"
      >
        🎭
        {unreadMoments > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-club px-1 text-[11px] font-bold text-white">
            {unreadMoments > 9 ? '9+' : unreadMoments}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[560px] max-h-[70vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
            {active ? (
              <button onClick={backToCast} className="text-xs font-bold text-club">
                ← All characters
              </button>
            ) : (
              <p className="text-sm font-bold">The Cast</p>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {active ? (
            <>
              {/* Character header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active.portrait_path ? `/${active.portrait_path}` : undefined}
                    alt={active.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold">{active.name}</p>
                  <p className="text-xs text-zinc-500">{active.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="pt-6 text-center text-sm text-zinc-500">
                    {active.tagline ?? `Talk to ${active.name}.`}
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                {busy && (
                  <p className="text-sm text-zinc-500">
                    {TYPING[typingIdx]}…
                  </p>
                )}
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
                  placeholder={`Say something to ${active.name}…`}
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
            </>
          ) : (
            <>
              {/* Cast grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <p className="mb-3 text-xs text-zinc-500">
                  AI characters, not real people — each with a job in the club.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {cast.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => openChat(c)}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition hover:border-club/50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.portrait_path ? `/${c.portrait_path}` : undefined}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{c.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {c.role}
                          {c.tagline ? ` — ${c.tagline}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <p className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600">
                The cast are AI characters in-character for fun. For real
                safety, use Report/Block in any chat.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
