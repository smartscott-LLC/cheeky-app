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

/**
 * The concierge — Chaz, the club manager. He's the face of the building:
 * reachable from every floor, every page, inside and out. The rest of the
 * cast live on their own floors (see /chat/[slug] and docs/floor-map.md).
 */
export default function Concierge() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [chaz, setChaz] = useState<CastMember | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState(0);
  const [unreadMoments, setUnreadMoments] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  // Start at the top, never yank the reader: only follow the stream when
  // they're already at the bottom. Scrolling up to read is never interrupted.
  // The container is scrolled directly (scrollTop) — scrollIntoView would
  // scroll the whole page, not just the chat box.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

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
      .eq('slug', 'chaz')
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setChaz(data as CastMember);
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
    if (!nearBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(
      () => setTypingIdx((i) => (i + 1) % TYPING.length),
      800
    );
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

  const send = async () => {
    const body = input.trim();
    if (!body || busy || !chaz) return;
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
          character: chaz.slug,
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

  if (!signedIn) return null;

  return (
    <>
      {/* The corner button — the manager's always on */}
      <button
        onClick={togglePanel}
        aria-label="Talk to Chaz, the club manager"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-club/50 bg-zinc-900 shadow-[0_0_20px_rgba(246,5,186,0.4)] transition hover:scale-105"
      >
        {chaz?.portrait_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/${chaz.portrait_path}`}
            alt={chaz.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl">🎭</span>
        )}
        {unreadMoments > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-club px-1 text-[11px] font-bold text-white">
            {unreadMoments > 9 ? '9+' : unreadMoments}
          </span>
        )}
      </button>

      {open && chaz && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[560px] max-h-[70vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
            <p className="font-body text-club text-sm font-bold">
              {chaz.name}{' '}
              <span className="text-xs font-semibold text-cyan">
                · Club Manager
              </span>
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-cyan hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Character header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={chaz.portrait_path ? `/${chaz.portrait_path}` : undefined}
                alt={chaz.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-body text-club font-bold">{chaz.name}</p>
              <p className="text-xs font-body text-club">{chaz.role}</p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <p className="pt-6 text-center text-sm font-body text-club">
                {chaz.tagline ?? `Talk to ${chaz.name}.`}
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
                      : 'bg-zinc-800 text-cyan'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <p className="text-sm font-body text-club">{TYPING[typingIdx]}…</p>
            )}
          </div>

          {error && (
            <p className="border-t border-zinc-800 px-4 py-2 text-xs font-body text-club">
              {error}
            </p>
          )}

          {/* Composer */}
          <div className="flex gap-2 border-t border-zinc-800 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={`Say something to ${chaz.name}…`}
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
      )}
    </>
  );
}
