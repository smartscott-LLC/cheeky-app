'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ownerFetchLounge,
  ownerLoungeBan,
  ownerLoungePardon
} from '@/app/owner/actions';

interface LoungeMsg {
  id: number;
  room: string;
  sender_id: string;
  body: string;
  floor_tag: string;
  horn: boolean;
  created_at: string;
  sender_name: string | null;
}
interface LoungeInvite {
  id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: string;
  inviter_name: string | null;
  invitee_name: string | null;
}
interface LoungeBan {
  id: string;
  user_id: string;
  banned_until: string;
  reason: string;
  created_at: string;
  user_name: string | null;
}
interface LoungeAnnounce {
  id: number;
  body: string;
  kind: string;
  created_at: string;
}
interface LoungeTotals {
  messages_24h: number;
  horn_24h: number;
  invites_pending: number;
  active_bans: number;
}

const ROOM_LABEL: Record<string, string> = {
  global: '🌐 The Lounge',
  silver: '🥈 Silver',
  gold: '🥇 Gold',
  platinum: '🔷 Platinum',
  diamond: '💎 Diamond'
};

const FLOOR_TONE: Record<string, string> = {
  silver: 'text-zinc-300',
  gold: 'text-yellow-300',
  platinum: 'text-cyan',
  diamond: 'text-blue-300'
};

const ago = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

/**
 * The Cheeky Lounge — Lions Den monitoring channel (PRD §10 owner
 * dashboard). Service-role feed across every room, regardless of blocks.
 * Realtime on message inserts; ban / pardon actions ride the existing
 * service-role RPCs. The Den is the only place this is mounted.
 */
export default function LoungeMonitor({ ownerKey }: { ownerKey: string }) {
  const [messages, setMessages] = useState<LoungeMsg[]>([]);
  const [invites, setInvites] = useState<LoungeInvite[]>([]);
  const [bans, setBans] = useState<LoungeBan[]>([]);
  const [announcements, setAnnouncements] = useState<LoungeAnnounce[]>([]);
  const [totals, setTotals] = useState<LoungeTotals | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [banDraft, setBanDraft] = useState<{
    userId: string;
    name: string | null;
  } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banHours, setBanHours] = useState<24 | 72>(24);

  const refresh = useCallback(async () => {
    setBusy(true);
    const res = await ownerFetchLounge({ key: ownerKey });
    setBusy(false);
    if (res.error) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    setMessages(res.messages ?? []);
    setInvites(res.invites ?? []);
    setBans(res.bans ?? []);
    setAnnouncements(res.announcements ?? []);
    setTotals(res.totals ?? null);
  }, [ownerKey]);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    // Realtime: new messages anywhere in the Lounge land in the monitor.
    // We use a service-channel created by the Den's own key — the page
    // gating is server-side; realtime just gets the inserts.
    const ch = supabase
      .channel('den-lounge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'club_chat_messages' },
        () => {
          // Light-touch refresh — a full page of latest 60 keeps the
          // ordering deterministic. The Den doesn't need true live insert
          // timing to the millisecond.
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_chat_invites' },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_chat_bans' },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const submitBan = async () => {
    if (!banDraft || !banReason.trim()) return;
    setBusy(true);
    const res = await ownerLoungeBan({
      key: ownerKey,
      userId: banDraft.userId,
      hours: banHours,
      reason: banReason.trim()
    });
    setBusy(false);
    if (res.error) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    setMsg({
      ok: true,
      text: `Banned ${banDraft.name ?? 'member'} from chat for ${banHours}h.`
    });
    setBanDraft(null);
    setBanReason('');
    refresh();
  };

  const pardon = async (banId: string, name: string | null) => {
    setBusy(true);
    const res = await ownerLoungePardon({ key: ownerKey, banId });
    setBusy(false);
    if (res.error) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    setMsg({ ok: true, text: `Pardoned ${name ?? 'member'} — back in the room.` });
    refresh();
  };

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-header text-amber-300 text-2xl">
            🍸 Lounge monitor
          </h2>
          <p className="font-body text-club mt-1 text-sm">
            Live feed across every room — service role sees all, even blocked
            pairs. The Den&apos;s only moderation surface.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={busy}
          className="rounded-lg border border-amber-400/40 px-4 py-1.5 text-sm font-bold text-amber-300 transition hover:border-amber-300 disabled:opacity-40"
        >
          {busy ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {msg && (
        <p
          className={`mt-3 text-sm ${msg.ok ? 'text-emerald-400' : 'font-body text-club'}`}
        >
          {msg.text}
        </p>
      )}

      {totals && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Messages · 24h', value: totals.messages_24h, icon: '💬' },
            { label: 'Horns · 24h', value: totals.horn_24h, icon: '🎺' },
            { label: 'Invites pending', value: totals.invites_pending, icon: '💌' },
            { label: 'Active chat bans', value: totals.active_bans, icon: '🚫' }
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-center"
            >
              <p className="font-body text-club text-2xl font-extrabold">
                {t.icon} {t.value.toLocaleString()}
              </p>
              <p className="font-body text-club mt-1 text-[10px] uppercase tracking-wider">
                {t.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live messages */}
        <div className="lg:col-span-2">
          <h3 className="font-header text-cyan text-lg">Live feed</h3>
          <p className="font-body text-club text-sm">Latest 60 across every room.</p>
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            {messages.length === 0 && (
              <p className="font-body text-club py-6 text-center text-sm">
                The room is quiet.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border p-2.5 ${
                  m.horn
                    ? 'border-gold/50 bg-gold/5'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-body text-club text-sm font-bold">
                    {m.horn && '🎺 '}
                    {m.sender_name ?? 'Member'}{' '}
                    <span className="font-body text-club text-xs">in</span>{' '}
                    <span className="text-cyan text-xs">
                      {ROOM_LABEL[m.room] ?? m.room}
                    </span>{' '}
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        FLOOR_TONE[m.floor_tag] ?? 'text-zinc-400'
                      }`}
                    >
                      · {m.floor_tag}
                    </span>
                  </p>
                  <p className="font-body text-club text-[10px]">{ago(m.created_at)}</p>
                </div>
                <p className="font-body text-club mt-1 break-words text-sm">{m.body}</p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() =>
                      setBanDraft({ userId: m.sender_id, name: m.sender_name })
                    }
                    className="font-body text-club text-[10px] uppercase tracking-wider transition hover:font-body text-club-cotton"
                  >
                    Ban from chat →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invites + bans */}
        <div className="space-y-6">
          <div>
            <h3 className="font-header text-cyan text-lg">💌 Take-private invites</h3>
            <p className="font-body text-club text-sm">Pending consents.</p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              {invites.length === 0 && (
                <p className="font-body text-club py-4 text-center text-sm">None open.</p>
              )}
              {invites.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-club/30 bg-club/5 p-2.5"
                >
                  <p className="font-body text-club text-sm">
                    <span className="font-bold text-white">
                      {i.inviter_name ?? 'Member'}
                    </span>{' '}
                    →{' '}
                    <span className="font-bold text-white">
                      {i.invitee_name ?? 'Member'}
                    </span>
                  </p>
                  <p className="font-body text-club mt-0.5 text-[10px]">
                    {ago(i.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-header text-cyan text-lg">🚫 Active chat bans</h3>
            <p className="font-body text-club text-sm">1d → 3d escalation.</p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              {bans.length === 0 && (
                <p className="font-body text-club py-4 text-center text-sm">
                  No active bans. The room is calm.
                </p>
              )}
              {bans.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-club/40 bg-club/10 p-2.5"
                >
                  <p className="font-body text-club text-sm font-bold">
                    {b.user_name ?? 'Member'}
                  </p>
                  <p className="font-body text-club mt-0.5 text-xs">{b.reason}</p>
                  <p className="font-body text-club mt-0.5 text-[10px]">
                    until {new Date(b.banned_until).toLocaleString()}
                  </p>
                  <button
                    onClick={() => pardon(b.id, b.user_name)}
                    disabled={busy}
                    className="mt-1.5 font-body text-club text-[10px] uppercase tracking-wider transition hover:font-body text-club-cotton disabled:opacity-40"
                  >
                    Pardon →
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-header text-cyan text-lg">🎺 Horn ticker</h3>
            <p className="font-body text-club text-sm">Last 15 across the club.</p>
            <div className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
              {announcements.length === 0 && (
                <p className="font-body text-club py-2 text-center text-xs">
                  Quiet on the horn.
                </p>
              )}
              {announcements.map((a) => (
                <p key={a.id} className="font-body text-club text-xs">
                  <span className="text-amber-300">{a.body}</span>{' '}
                  <span className="font-body text-club">· {ago(a.created_at)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ban dialog */}
      {banDraft && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setBanDraft(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-amber-400/50 bg-zinc-950 p-6 shadow-[0_0_30px_rgba(255,215,0,0.2)]"
          >
            <h3 className="font-header text-amber-300 text-xl">
              Ban from chat
            </h3>
            <p className="font-body text-club mt-1 text-sm">
              Banning{' '}
              <span className="font-bold text-white">
                {banDraft.name ?? 'this member'}
              </span>{' '}
              from the Lounge. They keep their account — just can&apos;t post
              for the duration. The room is the retention play; this only
              silences it.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="font-body text-club text-xs uppercase tracking-wider">
                  Duration
                </label>
                <div className="mt-1 flex gap-2">
                  {[24, 72].map((h) => (
                    <button
                      key={h}
                      onClick={() => setBanHours(h as 24 | 72)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                        banHours === h
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {h === 24 ? '1 day' : '3 days'}
                    </button>
                  ))}
                </div>
                <p className="font-body text-club mt-1 text-[10px]">
                  Founder default: 1d, then 3d for repeat offenders.
                </p>
              </div>
              <div>
                <label className="font-body text-club text-xs uppercase tracking-wider">
                  Reason (recorded)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                  placeholder="What happened? Goes on the ban record."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white outline-none focus:border-amber-300"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={submitBan}
                disabled={!banReason.trim() || busy}
                className="flex-1 rounded-lg bg-club px-3 py-2 text-sm font-bold text-white transition hover:opacity-80 disabled:opacity-40"
              >
                {busy ? 'Banning…' : `Ban for ${banHours === 24 ? '1 day' : '3 days'}`}
              </button>
              <button
                onClick={() => {
                  setBanDraft(null);
                  setBanReason('');
                }}
                className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
