'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { openConversation } from '@/app/messages/actions';
import {
  loungeFriendIds,
  loungeHeartbeat,
  loungeRespondInvite,
  loungeSend,
  loungeTier,
  loungeVerified,
  loungeWhisperGet,
  loungeHorn
} from '@/app/chat/actions';
import ClubChatMenu, { LoungePerson } from './ClubChatMenu';
import ClubChatWhisper from './ClubChatWhisper';

interface Msg {
  id: number;
  room: string;
  sender_id: string;
  body: string;
  floor_tag: string;
  horn: boolean;
  created_at: string;
}

interface Person {
  id: string;
  name: string;
  photo: string | null;
}

interface PendingInvite {
  id: string;
  inviter_id: string;
  created_at: string;
}

const ROOMS = [
  { key: 'global', label: 'The Lounge', emoji: '🌐', rank: -1 },
  { key: 'silver', label: 'Silver', emoji: '🥈', rank: 0 },
  { key: 'gold', label: 'Gold', emoji: '🥇', rank: 1 },
  { key: 'platinum', label: 'Platinum', emoji: '💎', rank: 2 },
  { key: 'diamond', label: 'Diamond', emoji: '🔷', rank: 3 }
] as const;



const PREFS_KEY = 'lounge:pos';
const MUTED_KEY = 'lounge:muted';
const HORN_KEY = 'lounge:hornAt';
const PHOTO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

const TIER_RANK: Record<string, number> = { silver: 0, gold: 1, platinum: 2, diamond: 3 };

const floorEmoji = (floor: string) =>
  floor === 'diamond' ? '🔷' : floor === 'platinum' ? '💎' : floor === 'gold' ? '🥇' : '🥈';

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The Cheeky Lounge — the town square (PRD docs/PRD-club-chat.md). A
 * floating, draggable, expandable chat overlay over every member page.
 * Five rooms; your floor + Global are full, the floors above are dimmed
 * read-only (the climb). Live via Realtime, presence via Realtime,
 * moderation and the consent-gated take-private handled server-side.
 */
export default function ClubChat() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [verified, setVerified] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Person | null>(null);
  const [tierRank, setTierRank] = useState(0);
  const [room, setRoom] = useState('global');
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [present, setPresent] = useState<Person[]>([]);
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const raw = localStorage.getItem(MUTED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number; person: LoungePerson } | null>(null);
  const [view, setView] = useState<'rooms' | 'whisper'>('rooms');
  const [whisper, setWhisper] = useState<{ id: string; person: LoungePerson } | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [hornUntil, setHornUntil] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : Number(localStorage.getItem(HORN_KEY) ?? 0)
  );
  const [pos, setPos] = useState(() => loadJson(PREFS_KEY, { x: 0, y: 0 }));

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Drag state — the panel's current render position (synced from pos state
  // via a ref) plus the pointer coordinates at the start of the current stroke.
  // Using a ref for anchorPos avoids a race: onPointerMove can fire before
  // React flushes the setState from onPointerDown.
  const anchorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ px: number; py: number } | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Keep anchorPosRef in sync with the rendered position.
  // When dragging, snap the anchor forward immediately after setPos so the
  // next move event doesn't re-apply the same delta from the old anchor.
  useEffect(() => {
    anchorPosRef.current = { x: pos.x, y: pos.y };
  }, [pos]);

  const activeRoom = ROOMS.find((r) => r.key === room) ?? ROOMS[0];
  const canType = activeRoom.rank === -1 || activeRoom.rank <= tierRank;
  const roomDim = activeRoom.rank > tierRank;
  const meId = me?.id;

  const hideMuted = useCallback(
    (m: Msg) => !muted.has(m.sender_id),
    [muted]
  );

  // The gate: verified members only. We never hide this on the home page —
  // verified members are IN the club and should always have the Lounge.
  useEffect(() => {
    let cancelled = false;
    // 5s timeout: if the verification call stalls (network, auth refresh),
    // default to showing the Lounge rather than keeping the pill hidden.
    const timer = setTimeout(() => {
      if (!cancelled) {
        console.warn('[lounge] verified timed out — showing lounge anyway');
        setVerified(true);
      }
    }, 5000);
    loungeVerified()
      .then((v) => {
        if (!cancelled) setVerified(v);
      })
      .catch((err) => {
        console.error('[lounge] verified failed:', err);
        if (!cancelled) setVerified(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Identity, tier, friends, invites.
  useEffect(() => {
    if (!verified) return;
    (async () => {
      let user: { id: string } | null = null;
      try {
        const {
          data: { user: u }
        } = await supabase.auth.getUser();
        user = u;
      } catch (err) {
        console.warn('[lounge] getUser failed, assuming no session:', err);
      }
      if (!user) return;
      setMe({ id: user.id, name: '', photo: null });

      const [tier, friendIds] = await Promise.all([
        loungeTier(),
        loungeFriendIds()
      ]);
      setTierRank(TIER_RANK[tier ?? 'silver'] ?? 0);
      setFriends(new Set(friendIds));

      // Fetch profile — best effort; 400s from PostgREST should not
      // kill the whole identity effect.
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, photos(storage_path, is_primary)')
          .eq('id', user.id)
          .single();
        if (profile) {
          setMe({
            id: user.id,
            name: profile.display_name || 'You',
            photo: profile.photos?.[0]?.storage_path ?? null
          });
        }
      } catch (err) {
        console.warn('[lounge] profile fetch failed:', err);
      }

      try {
        await refreshInvites();
      } catch (err) {
        console.warn('[lounge] invite refresh failed:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  const ensurePeople = useCallback(
    async (ids: string[]) => {
      const missing = ids.filter((id) => !people[id]);
      if (missing.length === 0) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', missing);
        setPeople((prev) => {
          const next = { ...prev };
          for (const p of data ?? []) {
            next[p.id] = {
              id: p.id,
              name: p.display_name || 'Member',
              photo: p.photos?.[0]?.storage_path ?? null
            };
          }
          return next;
        });
      } catch (err) {
        console.warn('[lounge] ensurePeople failed:', err);
      }
    },
    [people, supabase]
  );

  const refreshInvites = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('club_chat_invites')
      .select('id, inviter_id, created_at')
      .eq('invitee_id', user.id)
      .eq('status', 'pending');
    setInvites(data ?? []);
    ensurePeople((data ?? []).map((i) => i.inviter_id));
  }, [supabase, ensurePeople]);

  // Realtime: room messages (RLS decides who sees what) + presence.
  useEffect(() => {
    if (!verified) return;

    const ch = supabase
      .channel('lounge-msgs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'club_chat_messages' },
        (payload) => {
          const row = payload.new as Msg;
          setMessages((prev) => {
            const list = prev[row.room] ?? [];
            if (list.some((m) => m.id === row.id)) return prev;
            const next = { ...prev, [row.room]: [...list, row].slice(-200) };
            return next;
          });
          ensurePeople([row.sender_id]);
          if (!open) setUnseen((n) => n + 1);
        }
      )
      .subscribe();

    const pr = supabase
      .channel('lounge-presence')
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = pr.presenceState();
          const members = Object.values(state)
            .map((m) => m[0] as unknown as { id: string; name: string })
            .filter((m): m is { id: string; name: string } => m?.id != null)
            .map((m) => ({ id: m.id, name: m.name, photo: null }));
          setPresent(members);
        } catch {
          // stale channel — ignore
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && meId) {
          try {
            await pr.track({ id: meId, name: me?.name || 'You' });
          } catch {
            // channel already removed — best effort
          }
        }
      });

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(pr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, supabase, meId]);

  // Presence heartbeat (The Regular: an hour in the room) + invites poll.
  useEffect(() => {
    if (!verified) return;
    const hb = setInterval(() => {
      if (document.visibilityState === 'visible') loungeHeartbeat(60);
    }, 60_000);
    const inv = setInterval(refreshInvites, 30_000);
    return () => {
      clearInterval(hb);
      clearInterval(inv);
    };
  }, [verified, refreshInvites]);

  // Load a room's recent 24h on first view; keep the list pinned to the bottom.
  useEffect(() => {
    if (!open) return;
    if (messages[room]) return;
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const promise = supabase
      .from('club_chat_messages')
      .select('id, room, sender_id, body, floor_tag, horn, created_at')
      .eq('room', room)
      .gte('created_at', dayAgo)
      .order('created_at', { ascending: true })
      .limit(100);
    // Supabase returns a thenable; catch via .then(null, err) to avoid TS issue
    promise.then(
      ({ data }) => {
        const rows = data ?? [];
        setMessages((prev) => ({ ...prev, [room]: rows }));
        ensurePeople(rows.map((r) => r.sender_id));
      },
      () => {} // silent fail — chat can recover on next open
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room]);

  useEffect(() => {
    if (open) setUnseen(0);
  }, [open]);

  const roomMsgCount = (messages[room] ?? []).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMsgCount, room]);

  const saveMuted = (next: Set<string>) => {
    setMuted(next);
    try {
      localStorage.setItem(MUTED_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* session-only */
    }
  };

  const respondInvite = async (inviteId: string, accept: boolean) => {
    setAccepting(inviteId);
    setError(null);
    const res = await loungeRespondInvite(inviteId, accept);
    setAccepting(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (accept) {
      const inv = invites.find((i) => i.id === inviteId);
      const person = people[inv?.inviter_id ?? ''];
      if (person) await openConversation(person.id);
    }
    refreshInvites();
  };

  const onWhisper = async (person: LoungePerson) => {
    const res = await loungeWhisperGet(person.id);
    setMenu(null);
    if (res.error) {
      setNotice(res.error);
      return;
    }
    setWhisper({ id: res.whisperId!, person });
    setView('whisper');
  };

  // Drag the panel by its header (desktop only; mobile is a full sheet).
  // anchorPosRef holds the current rendered position; dragStartRef holds the
  // pointer coordinates at the start of the stroke. Deltas are computed
  // against the ref on every move — no React batching delay.
  const onHeaderDown = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    // Snapshot the current rendered position as the drag anchor.
    dragStartRef.current = { px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHeaderMove = (e: React.PointerEvent) => {
    if (!isDesktop || !dragStartRef.current) return;
    const { px, py } = dragStartRef.current;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    if (Math.abs(dx) + Math.abs(dy) <= 4) return; // click, not drag
    // Read directly from the ref — no React batching delay.
    const bp = anchorPosRef.current;
    const next = {
      x: Math.min(Math.max(bp.x + dx, -300), window.innerWidth - 100),
      y: Math.min(Math.max(bp.y + dy, -window.innerHeight + 80), window.innerHeight - 60)
    };
    setPos(next);
    // Snap the anchor forward synchronously so subsequent moves in the same
    // stroke don't double-count the delta this frame already applied.
    if (dragStartRef.current) anchorPosRef.current = next;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* session-only */
    }
  };

  const onHeaderUp = () => {
    dragStartRef.current = null;
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await loungeSend(room, body);
    setSending(false);
    setDraft('');
    if (res.error) setError(res.error);
  };

  const horn = async () => {
    const body = draft.trim();
    if (!body || sending || Date.now() < hornUntil) return;
    setSending(true);
    setError(null);
    const res = await loungeHorn(body);
    setSending(false);
    setDraft('');
    if (res.error) {
      setError(res.error);
    } else {
      const cooldown = Date.now() + 60 * 60 * 1000; // 1 hour
      setHornUntil(cooldown);
      try {
        localStorage.setItem(HORN_KEY, String(cooldown));
      } catch {
        /* session-only */
      }
      setNotice('🎺 The club heard that.');
    }
  };

  // Long-press = context menu (mobile); right-click handled inline.
  const onMsgPointerDown = (e: React.PointerEvent, person: LoungePerson) => {
    if (e.button !== 0) return;
    longPress.current = setTimeout(() => {
      setMenu({ x: e.clientX, y: e.clientY, person });
    }, 500);
  };
  const onMsgPointerUp = () => {
    if (longPress.current) clearTimeout(longPress.current);
  };

  if (verified === null) return null;
  if (!verified) return null;

  const presentList = present;

  return (
    <>
      {/* Floating button — right side, clear of Chaz (bottom-right) and the
          taskbar (bottom-left). Mobile: stacked above Chaz. Hidden when panel is open. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="The Cheeky Lounge"
          className="fixed bottom-20 right-5 z-50 flex h-12 items-center gap-2 rounded-full border border-gold/60 bg-zinc-950/95 px-4 shadow-[0_0_20px_rgba(255,215,0,0.25)] transition hover:scale-105 md:bottom-5 md:right-24"
        >
          <span className="text-xl">🍸</span>
          <span className="font-hero text-gold hidden text-sm sm:block">Lounge</span>
          {unseen > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-club px-1 text-[11px] font-bold text-white">
              {unseen > 9 ? '9+' : unseen}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className={`fixed z-[60] flex flex-col overflow-hidden rounded-2xl border-2 border-gold/70 bg-zinc-950 shadow-[0_0_40px_rgba(255,215,0,0.15)] ${
            isDesktop
              ? 'bottom-20 right-24 h-[600px] w-[380px] max-h-[75vh]'
              : 'inset-0 h-full w-full rounded-none'
          }`}
          style={
            isDesktop && (pos.x !== 0 || pos.y !== 0)
              ? { transform: `translate(${pos.x}px, ${pos.y}px)` }
              : undefined
          }
        >
          {/* Header — the drag handle */}
          <div
            data-drag-handle
            onPointerDown={onHeaderDown}
            onPointerMove={onHeaderMove}
            onPointerUp={onHeaderUp}
            className={`flex items-center justify-between border-b border-gold/30 bg-zinc-900 px-3 py-2 ${
              isDesktop ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <p className="font-header text-gold text-lg leading-none">
              🍸 The Cheeky Lounge
            </p>
            <div className="flex items-center gap-1">
              <span className="font-header text-cyan text-sm" title="In the room">
                {present.length}
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

          {/* Incoming take-private invites */}
          {invites.length > 0 && view === 'rooms' && (
            <div className="border-b border-club/30 bg-club/10 px-3 py-2">
              {invites.map((inv) => {
                const who = people[inv.inviter_id];
                return (
                  <div key={inv.id} className="mb-2 last:mb-0">
                    <p className="text-sm text-club">
                      <span className="font-bold text-white">
                        {who?.name ?? 'Someone'}
                      </span>{' '}
                      wants to take you private — this constitutes a match and counts
                      against your daily allowances.
                    </p>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        onClick={() => respondInvite(inv.id, true)}
                        disabled={accepting === inv.id}
                        className="flex-1 rounded-md bg-gold px-2 py-1 text-xs font-bold text-black transition hover:bg-gold-royal disabled:opacity-40"
                      >
                        {accepting === inv.id ? 'Working…' : 'Accept'}
                      </button>
                      <button
                        onClick={() => respondInvite(inv.id, false)}
                        disabled={accepting === inv.id}
                        className="flex-1 rounded-md border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
                      >
                        Decline — silently
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && view === 'rooms' && (
            <p className="border-b border-club/30 bg-club/10 px-3 py-1.5 text-xs text-club">
              {error}
            </p>
          )}
          {notice && view === 'rooms' && (
            <p className="border-b border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold">
              {notice}
            </p>
          )}

          {view === 'whisper' && whisper ? (
            <div className="flex h-full flex-col">
              <ClubChatWhisper
                whisperId={whisper.id}
                otherName={whisper.person.name}
                meId={me?.id ?? ''}
                onBack={() => {
                  setView('rooms');
                  setWhisper(null);
                }}
              />
            </div>
          ) : (
            <>
              {/* Room tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-2 py-1.5">
                {ROOMS.map((r) => {
                  const dim = r.rank > tierRank;
                  const active = r.key === room;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setRoom(r.key)}
                      title={dim ? 'Above your floor — read-only (the climb)' : r.label}
                      className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        active
                          ? 'bg-gold text-black'
                          : dim
                            ? 'border border-zinc-800 text-zinc-500 hover:border-zinc-600'
                            : 'border border-gold/40 text-gold hover:border-gold'
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
              {presentList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 px-3 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    In the room
                  </span>
                  {presentList.map((p) => {
                    const isFriend = friends.has(p.id) || p.id === me?.id;
                    const photo = p.id === me?.id ? me?.photo : undefined;
                    return (
                      <span
                        key={p.id}
                        title={p.name}
                        className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border text-[10px] font-bold ${
                          isFriend ? 'border-gold text-gold' : 'border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${PHOTO_BASE}${photo}`} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          p.name.charAt(0).toUpperCase()
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Messages */}
              <div
                className={`flex-1 space-y-2.5 overflow-y-auto p-3 ${roomDim ? 'opacity-60' : ''}`}
              >
                {(messages[room] ?? []).filter(hideMuted).length === 0 && (
                  <p className="pt-8 text-center text-sm text-club">
                    {roomDim
                      ? '👁 The climb — you can watch, but you can’t talk up here. The Diamond room is worth the stairs.'
                      : 'The room is quiet. Say something.'}
                  </p>
                )}
                {(messages[room] ?? []).filter(hideMuted).map((m) => {
                  const who = people[m.sender_id];
                  const isMe = m.sender_id === me?.id;
                  return (
                    <div
                      key={m.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({
                          x: e.clientX,
                          y: e.clientY,
                          person: { id: m.sender_id, name: who?.name ?? 'Member' }
                        });
                      }}
                      onPointerDown={(e) =>
                        onMsgPointerDown(e, { id: m.sender_id, name: who?.name ?? 'Member' })
                      }
                      onPointerUp={onMsgPointerUp}
                      className={`rounded-xl px-3 py-2 ${
                        m.horn
                          ? 'border border-gold bg-gradient-to-br from-gold/20 to-transparent shadow-[0_0_16px_rgba(255,215,0,0.2)]'
                          : 'bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-header text-cyan text-sm">
                          {isMe ? 'You' : who?.name ?? 'Member'}
                        </span>
                        <span className="text-[10px]">{floorEmoji(m.floor_tag)}</span>
                        {m.horn && <span className="text-xs">🎺</span>}
                      </div>
                      <p className="mt-0.5 text-sm break-words text-white">{m.body}</p>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer + Horn */}
              <div className="border-t border-zinc-800 p-2">
                {!canType ? (
                  <p className="px-1 pb-1 text-center text-xs text-club">
                    Read-only up here — the climb. Your floor and the Lounge are yours to talk in.
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
                        activeRoom.key === 'global' ? 'Say it to the whole club…' : `To the ${activeRoom.label} room…`
                      }
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-cyan"
                    />
                    <button
                      onClick={send}
                      disabled={!draft.trim() || sending}
                      className="rounded-lg bg-cyan px-3 py-1.5 text-sm font-bold text-black transition hover:opacity-80 disabled:opacity-40"
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
                          : 'border-gold text-gold hover:bg-gold/10'
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
        <ClubChatMenu
          x={menu.x}
          y={menu.y}
          person={menu.person}
          meId={me?.id ?? ''}
          onClose={() => setMenu(null)}
          onWhisper={onWhisper}
          onPrivate={(p) => {
            setMenu(null);
            setNotice(`💌 Invite sent to ${p.name}. If they accept — it’s a match.`);
          }}
          onMute={(id) => {
            saveMuted(new Set(muted).add(id));
            setNotice('Muted — their messages are hidden for you.');
          }}
        />
      )}
    </>
  );
}
