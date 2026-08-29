'use client';

// Stream Chat — the town square (PRD docs/PRD-club-chat.md).
//
// Custom UI built on the low-level stream-chat client (NOT the
// stream-chat-react component library). The reason: the founder wants
// the date-UI, the floor tags, and the Cheeky visual system baked in
// from the ground up, and stream-chat-react's CSS would fight that.
//
// What "amazing" looks like here:
//   - glassmorphism panel with a gold/cyan glow + a subtle parallax border
//   - per-message entry animation, staggered by index
//   - animated tab transitions, presence stack with hover tooltips
//   - the Horn: confetti burst + a 1.5s marquee banner across the panel
//   - typing indicators inside whisper
//   - profile peek in the context menu
//   - floor tag chips with the right palette per tier
//   - new-message pulse + auto-scroll
//
// Falls back to the Supabase-backed <ClubChat /> if Stream isn't
// configured or the token call fails.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Channel, Event, StreamChat } from 'stream-chat';
import {
  connectStream,
  disconnectStream,
  getStreamClient
} from '@/utils/stream/client';
import {
  streamSend,
  streamHorn,
  streamWhisperGet
} from '@/app/chat/stream-actions';
import ClubChat from '@/components/ui/ClubChat/ClubChat';
import StreamChatMenu, { StreamPerson } from './StreamChatMenu';
import StreamChatWhisper from './StreamChatWhisper';
import { HornBurst } from './HornBurst';
import { PresenceStack } from './PresenceStack';

const ROOMS = [
  { key: 'global', label: 'The Lounge', emoji: '🌐', rank: -1 },
  { key: 'silver', label: 'Silver', emoji: '🥈', rank: 0 },
  { key: 'gold', label: 'Gold', emoji: '🥇', rank: 1 },
  { key: 'platinum', label: 'Platinum', emoji: '💎', rank: 2 },
  { key: 'diamond', label: 'Diamond', emoji: '🔷', rank: 3 }
] as const;

type RoomKey = (typeof ROOMS)[number]['key'];
const TIER_RANK: Record<string, number> = { silver: 0, gold: 1, platinum: 2, diamond: 3 };

const PHOTO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;
const MUTED_KEY = 'lounge-stream:muted';

interface StreamMsg {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userImage?: string;
  floor?: string;
  horn?: boolean;
  createdAt: string;
}

export default function StreamChatOverlay() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState('silver');
  const [room, setRoom] = useState<RoomKey>('global');
  const [me, setMe] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [messages, setMessages] = useState<Record<RoomKey, StreamMsg[]>>({
    global: [],
    silver: [],
    gold: [],
    platinum: [],
    diamond: []
  });
  const [present, setPresent] = useState<StreamPerson[]>([]);
  const [muted, setMuted] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(MUTED_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hornUntil, setHornUntil] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : Number(localStorage.getItem('lounge:hornAt') ?? 0)
  );
  const [unseen, setUnseen] = useState(0);
  const [hornBurst, setHornBurst] = useState(0);
  const [menu, setMenu] = useState<{ x: number; y: number; person: StreamPerson } | null>(null);
  const [whisper, setWhisper] = useState<{
    channelId: string;
    other: StreamPerson;
  } | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const clientRef = useRef<StreamChat | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isDesktop =
    typeof window !== 'undefined' && window.innerWidth >= 768;

  // Feature flag — fetch the Stream bundle. If the route reports
  // {enabled: false} (no keys) or errors, fall back to the Supabase
  // chat (the one that was on the site before Stream).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/chat/stream-token', { method: 'POST' });
        if (!res.ok) {
          if (!cancelled) setEnabled(false);
          return;
        }
        const data = (await res.json()) as {
          enabled: boolean;
          apiKey?: string;
          token?: string;
          userId?: string;
          name?: string;
        };
        if (!data.enabled || !data.apiKey || !data.token) {
          if (!cancelled) setEnabled(false);
          return;
        }
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setEnabled(false);
          return;
        }
        const [{ data: profile }, tierRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, photos(storage_path, is_primary)')
            .eq('id', user.id)
            .maybeSingle(),
          supabase.rpc('current_tier', { p_user: user.id })
        ]);
        if (cancelled) return;
        const primary = (profile?.photos ?? []).find(
          (p: { is_primary: boolean }) => p.is_primary
        );
        const image = primary?.storage_path
          ? `${PHOTO_BASE}${primary.storage_path}`
          : null;
        setMe({ id: user.id, name: profile?.display_name ?? 'You', image });
        setTier((tierRes.data as string) ?? 'silver');

        const c = await connectStream(
          data.apiKey,
          {
            apiKey: data.apiKey,
            token: data.token,
            userId: data.userId!,
            name: data.name!
          },
          { name: profile?.display_name ?? 'You', image }
        );
        clientRef.current = c;
        if (cancelled) {
          await disconnectStream();
          return;
        }
        setEnabled(true);
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
      disconnectStream();
    };
  }, []);

  // Subscribe to the active room + presence; pipe message events into
  // local state so the UI re-renders.
  useEffect(() => {
    if (enabled !== true) return;
    const c = clientRef.current;
    if (!c) return;
    const ch = c.channel('messaging', `cheeky-${room}`, {
      name: ROOMS.find((r) => r.key === room)?.label,
      created_by_id: 'system'
    } as Record<string, unknown>);
    channelRef.current = ch;

    let mounted = true;
    (async () => {
      try {
        await ch.watch();
      } catch {
        // Channel may not exist yet — auto-create on first send.
      }
      if (!mounted) return;

      const stateMessages = (ch.state.messages as unknown as Array<{
        id: string;
        text: string;
        user?: { id: string; name?: string; image?: string };
        created_at?: string;
        custom?: { floor?: string; horn?: boolean };
      }>);
      const hydrated: StreamMsg[] = stateMessages.map((m) => ({
        id: m.id,
        text: m.text,
        userId: m.user?.id ?? '',
        userName: m.user?.name ?? 'Member',
        userImage: m.user?.image,
        floor: m.custom?.floor,
        horn: m.custom?.horn,
        createdAt: (m.created_at as string) ?? new Date().toISOString()
      }));
      setMessages((prev) => ({ ...prev, [room]: hydrated }));

      const onMessageNew = (event: Event) => {
        const m = event.message as
          | {
              id: string;
              text: string;
              user?: { id: string; name?: string; image?: string };
              custom?: { floor?: string; horn?: boolean };
              created_at?: string;
            }
          | undefined;
        if (!m) return;
        const next: StreamMsg = {
          id: m.id,
          text: m.text,
          userId: m.user?.id ?? '',
          userName: m.user?.name ?? 'Member',
          userImage: m.user?.image,
          floor: m.custom?.floor,
          horn: m.custom?.horn,
          createdAt: (m.created_at as string) ?? new Date().toISOString()
        };
        setMessages((prev) => ({
          ...prev,
          [room]: [...(prev[room] ?? []), next].slice(-200)
        }));
        if (m.custom?.horn) setHornBurst((n) => n + 1);
        if (!open) setUnseen((n) => n + 1);
      };
      ch.on('message.new', onMessageNew);

      const refreshPresence = () => {
        try {
          const state = ch.state;
          const members = Object.values(
            (state.members as Record<string, { user_id: string; user?: { name?: string; image?: string } }>) ?? {}
          );
          setPresent(
            members.map((m) => ({
              id: m.user_id,
              name: m.user?.name ?? 'Member',
              image: m.user?.image ?? null
            }))
          );
        } catch {
          // ignore
        }
      };
      refreshPresence();
      ch.on('member.updated', refreshPresence);
      ch.on('member.added', refreshPresence);
    })();

    return () => {
      mounted = false;
      try {
        ch.stopWatching();
      } catch {
        // ignore
      }
    };
  }, [enabled, room, open]);

  useEffect(() => {
    if (open) setUnseen(0);
  }, [open]);

  const roomMsgCount = (messages[room] ?? []).length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room, roomMsgCount]);

  const activeRoom = ROOMS.find((r) => r.key === room) ?? ROOMS[0];
  const canType = useMemo(
    () => activeRoom.rank === -1 || activeRoom.rank <= (TIER_RANK[tier] ?? 0),
    [activeRoom.rank, tier]
  );

  const saveMuted = useCallback((next: Set<string>) => {
    setMuted(next);
    try {
      localStorage.setItem(MUTED_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* session-only */
    }
  }, []);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await streamSend(room, body);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDraft('');
  }, [draft, room, sending]);

  const horn = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending || Date.now() < hornUntil) return;
    setSending(true);
    setError(null);
    const res = await streamHorn(body);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const cooldown = Date.now() + 60 * 60 * 1000;
    setHornUntil(cooldown);
    try {
      localStorage.setItem('lounge:hornAt', String(cooldown));
    } catch {
      /* session-only */
    }
    setNotice('🎺 The club heard that.');
    setHornBurst((n) => n + 1);
    setDraft('');
  }, [draft, hornUntil, sending]);

  const onWhisper = useCallback(async (person: StreamPerson) => {
    const res = await streamWhisperGet(person.id);
    setMenu(null);
    if (res.error) {
      setNotice(res.error);
      return;
    }
    setWhisper({ channelId: res.channelId!, other: person });
  }, []);

  // Wait for the feature flag — during this window the Supabase chat is
  // the visible overlay. Once the flag resolves true, the Stream overlay
  // takes over; on false, the Supabase chat keeps running.
  if (enabled === null || enabled === false) {
    return <ClubChat />;
  }

  const visible = (messages[room] ?? []).filter((m) => !muted.has(m.userId));

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="The Cheeky Lounge"
          className="group fixed bottom-20 right-5 z-50 flex h-12 items-center gap-2 rounded-full border border-gold/60 bg-zinc-950/95 px-4 shadow-[0_0_20px_rgba(255,215,0,0.25)] transition hover:scale-105 hover:border-gold hover:shadow-[0_0_30px_rgba(255,215,0,0.45)] md:bottom-5 md:right-24"
        >
          <span className="text-xl transition group-hover:rotate-12">🍸</span>
          <span className="font-hero text-gold hidden text-sm sm:block">
            Lounge
          </span>
          {unseen > 0 && (
            <span className="flex h-5 min-w-5 animate-[pulseIn_0.3s_ease-out] items-center justify-center rounded-full bg-club px-1 text-[11px] font-bold text-white">
              {unseen > 9 ? '9+' : unseen}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className={`fixed z-[60] flex flex-col overflow-hidden rounded-2xl border-2 border-gold/60 bg-zinc-950/90 backdrop-blur-xl shadow-[0_0_50px_rgba(255,215,0,0.18),0_0_120px_rgba(34,211,238,0.08)] animate-[panelIn_0.25s_ease-out] ${
            isDesktop
              ? 'bottom-20 right-24 h-[620px] w-[400px] max-h-[78vh]'
              : 'inset-0 h-full w-full rounded-none'
          }`}
        >
          <HornBurst trigger={hornBurst} />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-gold/30 bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍸</span>
              <p className="font-header text-gold text-lg leading-none">
                The Cheeky Lounge
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full bg-cyan/20 px-2 py-0.5 font-header text-cyan text-xs"
                title="In the room"
              >
                {present.length} here
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded px-1.5 py-0.5 text-sm text-zinc-400 transition hover:text-club"
                title="Close the Lounge"
              >
                ✕
              </button>
            </div>
          </div>

          {error && (
            <p className="border-b border-club/30 bg-club/10 px-3 py-1.5 text-xs text-club">
              {error}
            </p>
          )}
          {notice && (
            <p className="border-b border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold">
              {notice}
            </p>
          )}

          {whisper ? (
            <StreamChatWhisper
              channelId={whisper.channelId}
              otherName={whisper.other.name}
              meId={me?.id ?? ''}
              client={clientRef.current}
              onBack={() => setWhisper(null)}
            />
          ) : (
            <>
              {/* Room tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-2 py-1.5">
                {ROOMS.map((r) => {
                  const dim = r.rank > (TIER_RANK[tier] ?? 0);
                  const active = r.key === room;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setRoom(r.key)}
                      title={
                        dim ? 'Above your floor — read-only' : r.label
                      }
                      className={`relative flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        active
                          ? 'bg-gold text-black shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                          : dim
                            ? 'border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                            : 'border border-gold/40 text-gold hover:border-gold hover:bg-gold/10'
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.label}</span>
                      {dim && <span className="opacity-60">👁</span>}
                    </button>
                  );
                })}
              </div>

              {/* Presence strip */}
              {present.length > 0 && (
                <div className="border-b border-zinc-800 px-3 py-2">
                  <PresenceStack
                    people={present}
                    selfId={me?.id ?? ''}
                  />
                </div>
              )}

              {/* Messages */}
              <div
                className={`flex-1 space-y-2 overflow-y-auto p-3 transition-opacity duration-300 ${
                  !canType ? 'opacity-60' : ''
                }`}
              >
                {visible.length === 0 && (
                  <p className="pt-8 text-center text-sm text-club">
                    {canType
                      ? '✨ The room is quiet. Be the first to say something.'
                      : '👁 The climb — you can watch, but you can’t talk up here.'}
                  </p>
                )}
                {visible.map((m, idx) => {
                  const isMe = m.userId === me?.id;
                  // Stagger only the first few — cheap and lively.
                  const delay = idx < 6 ? `${idx * 50}ms` : '0ms';
                  return (
                    <div
                      key={m.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({
                          x: e.clientX,
                          y: e.clientY,
                          person: { id: m.userId, name: m.userName }
                        });
                      }}
                      style={{ animationDelay: delay }}
                      className={`animate-[messageIn_0.32s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl px-3 py-2 ${
                        m.horn
                          ? 'relative border border-gold bg-gradient-to-br from-gold/30 via-gold/10 to-transparent shadow-[0_0_24px_rgba(255,215,0,0.4)]'
                          : isMe
                            ? 'ml-auto max-w-[80%] bg-gradient-to-br from-cyan/30 to-cyan/10 ring-1 ring-cyan/30'
                            : 'mr-auto max-w-[80%] bg-zinc-900/70 ring-1 ring-zinc-700/50'
                      }`}
                    >
                      {m.horn && (
                        <div className="absolute -top-2 right-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold text-black shadow-[0_0_10px_rgba(255,215,0,0.6)]">
                          🎺 HORN
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-header text-sm ${
                            isMe ? 'text-cyan' : 'text-cyan/90'
                          }`}
                        >
                          {isMe ? 'You' : m.userName}
                        </span>
                        {m.floor && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${FLOOR_CHIP[m.floor] ?? 'bg-zinc-800 text-zinc-400'}`}
                          >
                            {floorEmoji(m.floor)} {m.floor}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm break-words text-white">
                        {m.text}
                      </p>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="relative border-t border-zinc-800 bg-zinc-900/40 p-2">
                {!canType ? (
                  <p className="px-1 pb-1 text-center text-xs text-club">
                    Read-only up here — the climb.
                  </p>
                ) : (
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
                      placeholder={
                        activeRoom.key === 'global'
                          ? 'Say it to the whole club…'
                          : `To the ${activeRoom.label} room…`
                      }
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black/80 px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-cyan focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]"
                    />
                    <button
                      onClick={send}
                      disabled={!draft.trim() || sending}
                      className="rounded-lg bg-cyan px-3 py-1.5 text-sm font-bold text-black transition hover:bg-cyan/90 disabled:opacity-40"
                    >
                      Send
                    </button>
                    <button
                      onClick={horn}
                      disabled={
                        !draft.trim() || sending || Date.now() < hornUntil
                      }
                      title="The Horn — 10 tokens, one per hour, across the club ticker"
                      className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition disabled:opacity-40 ${
                        Date.now() < hornUntil
                          ? 'border-zinc-700 text-zinc-500'
                          : 'border-gold text-gold hover:bg-gold/15 hover:shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                      }`}
                    >
                      🎺
                      {Date.now() < hornUntil && (
                        <span className="ml-1 text-[10px]">
                          {Math.ceil((hornUntil - Date.now()) / 60_000)}m
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {menu && (
        <StreamChatMenu
          x={menu.x}
          y={menu.y}
          person={menu.person}
          meId={me?.id ?? ''}
          onClose={() => setMenu(null)}
          onWhisper={(p) => {
            onWhisper(p);
          }}
          onMute={(id) => {
            saveMuted(new Set(muted).add(id));
            setNotice('Muted — their messages are hidden for you.');
          }}
          onPrivate={(p) => {
            setMenu(null);
            setNotice(`💌 Invite sent to ${p.name}. If they accept — it's a match.`);
          }}
        />
      )}
    </>
  );
}

const floorEmoji = (floor: string) =>
  floor === 'diamond'
    ? '🔷'
    : floor === 'platinum'
      ? '💎'
      : floor === 'gold'
        ? '🥇'
        : '🥈';

const FLOOR_CHIP: Record<string, string> = {
  silver: 'bg-zinc-700/60 text-zinc-200',
  gold: 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30',
  platinum: 'bg-cyan/20 text-cyan ring-1 ring-cyan/30',
  diamond: 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30'
};
