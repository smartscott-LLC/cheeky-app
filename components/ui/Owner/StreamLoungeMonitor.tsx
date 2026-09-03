'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ownerFetchStreamLounge,
  ownerStreamBanAction
} from '@/app/owner/actions';

interface RoomLatest {
  id: string;
  text: string;
  userName: string;
  userId: string;
  horn: boolean;
  createdAt: string;
}
interface Room {
  key: string;
  label: string;
  emoji: string;
  count: number;
  latest: RoomLatest[];
}

/**
 * The Stream Lounge — Lion Den monitoring channel. Reads straight from
 * the Stream server SDK so the owner sees the live transport, not the
 * Supabase mirror. One-click ban is wired to the Stream ban endpoint
 * (and mirrored to Supabase for the fallback path).
 */
export default function StreamLoungeMonitor({ ownerKey }: { ownerKey: string }) {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [totals, setTotals] = useState<{ messages_24h: number; horns_24h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [banDraft, setBanDraft] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banHours, setBanHours] = useState<24 | 72>(24);

  const refresh = useCallback(async () => {
    setBusy(true);
    const res = await ownerFetchStreamLounge({ key: ownerKey });
    setBusy(false);
    if (res.error) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    setRooms(res.rooms ?? []);
    setTotals(res.totals ?? null);
  }, [ownerKey]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const submitBan = async () => {
    if (!banDraft || !banReason.trim()) return;
    setBusy(true);
    const res = await ownerStreamBanAction({
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
      text: `Banned ${banDraft.name} from chat for ${banHours}h (Stream + Supabase).`
    });
    setBanDraft(null);
    setBanReason('');
    refresh();
  };

  if (rooms === null) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-zinc-900/50 p-6">
        <p className="font-header text-amber-300 text-2xl">📡 Stream Lounge</p>
        <p className="font-body text-club mt-1 text-sm">Loading rooms…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-header text-amber-300 text-2xl">📡 Stream Lounge</h2>
          <p className="font-body text-club mt-1 text-sm">
            Live read from the Stream server SDK — what the members see
            right now, regardless of blocks.
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
            { label: 'Horns · 24h', value: totals.horns_24h, icon: '🎺' }
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

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <div
            key={r.key}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-club text-sm font-bold">
                {r.emoji} {r.label}
              </p>
              <p className="font-body text-club text-[10px]">{r.count} · 24h</p>
            </div>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto text-xs">
              {r.latest.length === 0 && (
                <p className="font-body text-club py-2 text-center">No messages yet.</p>
              )}
              {r.latest.map((m) => (
                <div
                  key={m.id}
                  className={`rounded border px-2 py-1 ${
                    m.horn
                      ? 'border-gold/50 bg-gold/10'
                      : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  <p className="font-body text-club text-[10px] font-bold">
                    {m.horn && '🎺 '}
                    {m.userName}
                  </p>
                  <p className="font-body text-club line-clamp-1 text-xs">{m.text}</p>
                  <button
                    onClick={() =>
                      setBanDraft({ userId: m.userId, name: m.userName })
                    }
                    className="font-body text-club mt-0.5 text-[9px] uppercase tracking-wider transition hover:font-body text-club-cotton"
                  >
                    Ban from chat →
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
              Stream + Supabase ban
            </h3>
            <p className="font-body text-club mt-1 text-sm">
              Banning{' '}
              <span className="font-bold text-white">{banDraft.name}</span>{' '}
              from chat on the live transport. Mirrored to Supabase so the
              fallback stays consistent.
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
              </div>
              <div>
                <label className="font-body text-club text-xs uppercase tracking-wider">
                  Reason
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                  placeholder="What happened?"
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
