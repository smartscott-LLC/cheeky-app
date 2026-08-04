'use client';

import { useEffect, useState } from 'react';
import {
  ownerFetchState,
  ownerGenerateCodes,
  ownerGrantDirect,
  ownerResolveFlag,
  ownerToggleEngine,
  ownerPostAnnouncement,
  ownerUpdateModels,
  ownerSetFloorClosure
} from '@/app/owner/actions';

type BenefitType = 'membership' | 'tokens' | 'gift';

interface Rule {
  benefit_type: string;
  benefit_value: string;
  owner_only: boolean;
  weekly_limit: number | null;
}
interface CodeRow {
  id: string;
  code: string;
  benefit_type: string;
  benefit_value: string;
  actor_type: string;
  actor_ref: string | null;
  used_count: number;
  max_uses: number;
  expires_at: string | null;
  created_at: string;
  notes: string | null;
}
interface GrantRow {
  id: string;
  benefit_type: string;
  benefit_value: string;
  reason: string;
  actor_type: string;
  actor_ref: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
}
interface FlagRow {
  id: string;
  user_id: string;
  actor_ref: string | null;
  benefit_type: string;
  benefit_value: string;
  reason: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
  characters: { name: string } | null;
}

const GIFT_LABEL: Record<string, string> = {
  teddy: '🧸 Stuffed Bear',
  golden_roses: '🌹 Golden Bouquet',
  jewelry: '💎 Jewelry',
  champagne: '🍾 Champagne',
  gift_basket: '🧺 Gift Basket'
};
const label = (t: string, v: string) => {
  if (t === 'gift') return GIFT_LABEL[v] ?? v;
  if (t === 'membership') return `${v} membership`;
  if (t === 'bundle') {
    try {
      const p = JSON.parse(v);
      const parts: string[] = [];
      if (p.tokens) parts.push(`${p.tokens} tokens`);
      if (p.membership) parts.push(p.membership);
      if (Array.isArray(p.gifts))
        parts.push(...p.gifts.map((g: string) => GIFT_LABEL[g] ?? g));
      return parts.join(' + ') || 'bundle';
    } catch {
      return 'bundle';
    }
  }
  return `${v} tokens`;
};

export default function OwnerPage() {
  const [key, setKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [engine, setEngine] = useState(true);
  const [rules, setRules] = useState<Rule[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [announcement, setAnnouncement] = useState<{
    message: string;
    display_style: string;
    ends_at: string | null;
  } | null>(null);
  const [unpurchased, setUnpurchased] = useState<
    { id: string; display_name: string | null; verified_at: string | null }[]
  >([]);
  const [metrics, setMetrics] = useState({
    members: 0,
    verified: 0,
    paid: 0,
    tokensOut: 0,
    giftsOut: 0,
    redeemed: 0,
    newThisWeek: 0,
    msgsToday: 0
  });
  const [events, setEvents] = useState<
    {
      id: string;
      kind: string;
      floor: string;
      starts_at: string;
      status: string;
      token_cost: number;
      entrants: number;
    }[]
  >([]);
  const [ledger, setLedger] = useState<
    {
      id: number;
      delta: number;
      reason: string | null;
      ref: string | null;
      created_at: string;
    }[]
  >([]);
  const [catalog, setCatalog] = useState<
    { id: string; slug: string; name: string; emoji: string; token_cost: number }[]
  >([]);
  // Emergency controls — model failover + floor closures.
  const [castModel, setCastModel] = useState('deepseek-chat');
  const [watchdogModel, setWatchdogModel] = useState(
    'nvidia/nemotron-nano-12b-v2-vl:free'
  );
  const [closures, setClosures] = useState<
    { floor: string; reason: string | null; until: string | null }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  // The Mint — the right-hand drawer that prints what the member needs.
  const [mintOpen, setMintOpen] = useState(false);
  const [mintRows, setMintRows] = useState<
    { id: number; kind: 'tokens' | 'gift' | 'membership'; value: string }[]
  >([{ id: 1, kind: 'tokens', value: '5' }]);
  const [mintNotes, setMintNotes] = useState('');
  const [mintCount, setMintCount] = useState(1);
  const [mintFresh, setMintFresh] = useState<string[]>([]);

  const notice = (ok: boolean, text: string) => setMsg({ ok, text });

  // Auto-unlock: if the signed-in account IS the owner, the Booth opens
  // with no key (the back door). The key input below is the fallback path.
  useEffect(() => {
    unlock('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = async (attemptKey: string) => {
    setBusy(true);
    const res = await ownerFetchState({ key: attemptKey });
    setBusy(false);
    if (res.error) {
      // Silent fail on the mount-time back-door attempt (not signed in as
      // the owner) — show the key input instead. Manual attempts show it.
      if (attemptKey !== '') notice(false, res.error);
      return;
    }
    setEngine(res.engineEnabled ?? true);
    setRules((res.rules ?? []) as Rule[]);
    setCodes((res.codes ?? []) as CodeRow[]);
    setGrants((res.grants ?? []) as GrantRow[]);
    setFlags((res.flags ?? []) as FlagRow[]);
    setAnnouncement(
      (res.announcement as {
        message: string;
        display_style: string;
        ends_at: string | null;
      } | null) ?? null
    );
    setUnpurchased(
      (res.unpurchased ?? []) as {
        id: string;
        display_name: string | null;
        verified_at: string | null;
      }[]
    );
    setMetrics(
      res.metrics ?? {
        members: 0,
        verified: 0,
        paid: 0,
        tokensOut: 0,
        giftsOut: 0,
        redeemed: 0,
        newThisWeek: 0,
        msgsToday: 0
      }
    );
    setEvents((res.events ?? []) as typeof events);
    setLedger((res.ledger ?? []) as typeof ledger);
    setCatalog((res.catalog ?? []) as typeof catalog);
    setCastModel(res.castModel ?? 'deepseek-chat');
    setWatchdogModel(
      res.watchdogModel ?? 'nvidia/nemotron-nano-12b-v2-vl:free'
    );
    setClosures((res.closures ?? []) as typeof closures);
    setUnlocked(true);
  };

  const refresh = async () => {
    const res = await ownerFetchState({ key });
    if (!res.error) {
      setEngine(res.engineEnabled ?? true);
      setRules((res.rules ?? []) as Rule[]);
      setCodes((res.codes ?? []) as CodeRow[]);
      setGrants((res.grants ?? []) as GrantRow[]);
      setFlags((res.flags ?? []) as FlagRow[]);
      setAnnouncement(
        (res.announcement as {
          message: string;
          display_style: string;
          ends_at: string | null;
        } | null) ?? null
      );
      setUnpurchased(
        (res.unpurchased ?? []) as {
          id: string;
          display_name: string | null;
          verified_at: string | null;
        }[]
      );
      setMetrics(
        res.metrics ?? {
          members: 0,
          verified: 0,
          paid: 0,
          tokensOut: 0,
          giftsOut: 0,
          redeemed: 0,
          newThisWeek: 0,
          msgsToday: 0
        }
      );
      setEvents((res.events ?? []) as typeof events);
      setLedger((res.ledger ?? []) as typeof ledger);
      setCatalog((res.catalog ?? []) as typeof catalog);
      setCastModel(res.castModel ?? 'deepseek-chat');
      setWatchdogModel(
        res.watchdogModel ?? 'nvidia/nemotron-nano-12b-v2-vl:free'
      );
      setClosures((res.closures ?? []) as typeof closures);
    }
  };

  // The Mint — print presets and the bundle builder.
  const PRESETS = [
    {
      label: '⚡ Event glitch kit',
      payload: { tokens: 8, gifts: ['teddy'] },
      note: 'glitched event: entry back + comfort'
    },
    {
      label: '🧸 No-match comfort',
      payload: { tokens: 5 },
      note: 'no-match comfort'
    },
    {
      label: '🌹 Complaint soothe',
      payload: { tokens: 10, gifts: ['golden_roses'] },
      note: 'complaint gesture'
    },
    {
      label: '🥇 Gold weekend',
      payload: { membership: 'gold' },
      note: 'special occasion'
    }
  ];

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const rows: { id: number; kind: 'tokens' | 'gift' | 'membership'; value: string }[] =
      [];
    let id = 1;
    if (typeof p.payload.tokens === 'number')
      rows.push({ id: id++, kind: 'tokens', value: String(p.payload.tokens) });
    if (typeof p.payload.membership === 'string')
      rows.push({ id: id++, kind: 'membership', value: p.payload.membership });
    if (Array.isArray(p.payload.gifts))
      (p.payload.gifts as string[]).forEach((g) =>
        rows.push({ id: id++, kind: 'gift', value: g })
      );
    setMintRows(rows.length ? rows : [{ id: 1, kind: 'tokens', value: '5' }]);
    setMintNotes(p.note);
    setMintFresh([]);
  };

  const addMintRow = () =>
    setMintRows((r) => [
      ...r,
      { id: Date.now(), kind: 'tokens', value: '' }
    ]);
  const removeMintRow = (id: number) =>
    setMintRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const setMintRow = (
    id: number,
    patch: Partial<{ kind: 'tokens' | 'gift' | 'membership'; value: string }>
  ) => setMintRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const printMint = async () => {
    const payload: { tokens?: number; gifts?: string[]; membership?: string } = {};
    const gifts: string[] = [];
    for (const row of mintRows) {
      const v = row.value.trim();
      if (!v) continue;
      if (row.kind === 'tokens')
        payload.tokens = (payload.tokens ?? 0) + Math.max(1, parseInt(v, 10) || 1);
      else if (row.kind === 'gift') gifts.push(v);
      else payload.membership = v;
    }
    if (gifts.length) payload.gifts = gifts;
    setBusy(true);
    const res = await ownerGenerateCodes({
      key,
      benefitType: 'bundle',
      benefitValue: JSON.stringify(payload),
      count: mintCount,
      notes: mintNotes.trim() || 'minted from the Lions Den'
    });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    setMintFresh(res.codes ?? []);
    notice(true, `${res.codes?.length ?? 0} code(s) printed — hand them out`);
    refresh();
  };

  const generate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const res = await ownerGenerateCodes({
      key,
      benefitType: String(fd.get('type')) as BenefitType,
      benefitValue: String(fd.get('value') ?? ''),
      count: Number(fd.get('count') ?? 1),
      notes: String(fd.get('notes') ?? '')
    });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    setFresh(res.codes ?? []);
    notice(true, `${res.codes?.length ?? 0} code(s) generated`);
    refresh();
  };

  const grantDirect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const res = await ownerGrantDirect({
      key,
      email: String(fd.get('email') ?? ''),
      benefitType: String(fd.get('type')) as BenefitType,
      benefitValue: String(fd.get('value') ?? ''),
      reason: String(fd.get('reason') ?? ''),
      days: Number(fd.get('days') ?? 30)
    });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    notice(true, 'Granted');
    e.currentTarget.reset();
    refresh();
  };

  const resolveFlag = async (flagId: string, action: 'grant' | 'give-code' | 'dismiss') => {
    setBusy(true);
    const res = await ownerResolveFlag({ key, flagId, action });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    if (res.code) {
      notice(true, `Code minted for the cast: ${res.code} — they'll hand it over in chat`);
    } else {
      notice(true, action === 'grant' ? 'Flag granted — member got it' : 'Flag dismissed');
    }
    refresh();
  };

  const toggleEngine = async () => {
    setBusy(true);
    const res = await ownerToggleEngine({ key, enabled: !engine });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    setEngine(res.enabled ?? !engine);
    notice(true, res.enabled ? 'Engine ON' : 'Engine OFF (fail-closed)');
  };

  const postAnnounce = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const res = await ownerPostAnnouncement({
      key,
      message: String(fd.get('message') ?? ''),
      displayStyle: String(fd.get('style') ?? 'scroll') as 'scroll' | 'roll' | 'fade',
      hours: Number(fd.get('hours') ?? 0)
    });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    e.currentTarget.reset();
    notice(true, 'Announcement posted — the floors pick it up within a minute');
  };

  const clearAnnounce = async () => {
    setBusy(true);
    const res = await ownerPostAnnouncement({ key, clear: true });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    notice(true, 'Announcement cleared');
  };

  const saveModels = async () => {
    setBusy(true);
    const res = await ownerUpdateModels({ key, castModel, watchdogModel });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    notice(true, 'Models saved — live on the next request');
  };

  const setFloor = async (
    floor: string,
    closed: boolean,
    reason: string,
    hours: number
  ) => {
    setBusy(true);
    const res = await ownerSetFloorClosure({ key, floor, closed, reason, hours });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    notice(true, closed ? `${floor} is under construction` : `${floor} is open`);
    refresh();
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text);

  if (!unlocked) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-md px-6 py-24">
          <h1 className="text-center text-3xl font-extrabold">🗝️ The Owner&apos;s Booth</h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Keyed access. Swag generation, flags, and the engine switch live here.
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && unlock(key)}
            placeholder="Owner key"
            className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:ring-2 focus:ring-club/50"
          />
          <button
            onClick={() => unlock(key)}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
          >
            Unlock
          </button>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Signed in as the owner? The Booth opens on its own — no key needed.
          </p>
          {msg && (
            <p className={`mt-3 text-center text-sm ${msg.ok ? 'text-zinc-400' : 'text-club'}`}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">🦁 The Lions Den</h1>
            <p className="mt-1 text-sm text-zinc-500">
              The club from one seat — mint, announce, and keep the floors
              moving.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMintOpen(true)}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black transition hover:bg-gold/80"
            >
              ⚒️ Open the Mint
            </button>
            <button
              onClick={toggleEngine}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                engine ? 'bg-emerald-600 text-white' : 'bg-club text-white'
              }`}
            >
              {engine ? '● Engine ON' : '● Engine OFF'}
            </button>
          </div>
        </div>

        {msg && (
          <p className={`mt-3 text-sm ${msg.ok ? 'text-emerald-400' : 'text-club'}`}>{msg.text}</p>
        )}

        {/* The pulse — minimal metrics, no dashboards required */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Verified members', value: metrics.verified, icon: '🧍' },
            { label: 'All members', value: metrics.members, icon: '📈' },
            { label: 'Paid now', value: metrics.paid, icon: '🎫' },
            { label: 'Tokens out', value: metrics.tokensOut, icon: '🪙' },
            { label: 'New this week', value: metrics.newThisWeek, icon: '👋' },
            { label: 'Msgs today', value: metrics.msgsToday, icon: '💬' },
            { label: 'Gifts out', value: metrics.giftsOut, icon: '📦' },
            { label: 'Codes redeemed', value: metrics.redeemed, icon: '🎟️' }
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center"
            >
              <p className="text-2xl font-extrabold text-white">
                {m.icon} {m.value.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Fresh codes */}
        {fresh.length > 0 && (
          <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              New codes — hand these out
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {fresh.map((c) => (
                <button
                  key={c}
                  onClick={() => copy(c)}
                  className="rounded-md border border-emerald-500/40 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-emerald-300 hover:border-emerald-400"
                  title="Click to copy"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flags */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">🚩 The flag job</h2>
          {flags.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No open flags. The cast hasn&apos;t needed the owner.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="rounded-xl border border-club/30 bg-zinc-900/60 p-4">
                  <p className="text-sm">
                    <span className="font-bold">{f.characters?.name ?? f.actor_ref ?? 'A cast member'}</span>{' '}
                    wanted to give{' '}
                    <span className="font-bold text-club">{label(f.benefit_type, f.benefit_value)}</span>{' '}
                    to <span className="font-bold">{f.profiles?.display_name ?? 'a member'}</span>
                  </p>
                  <p className="mt-1 text-sm italic text-zinc-400">“{f.reason}”</p>
                  <p className="mt-1 text-xs text-zinc-600">{new Date(f.created_at).toLocaleString()}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => resolveFlag(f.id, 'grant')}
                      disabled={busy}
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Grant it
                    </button>
                    <button
                      onClick={() => resolveFlag(f.id, 'give-code')}
                      disabled={busy}
                      className="rounded-lg bg-club px-4 py-1.5 text-sm font-bold text-white hover:bg-club-cotton disabled:opacity-40"
                    >
                      🎭 Give the cast a code
                    </button>
                    <button
                      onClick={() => resolveFlag(f.id, 'dismiss')}
                      disabled={busy}
                      className="rounded-lg border border-zinc-600 px-4 py-1.5 text-sm font-bold text-zinc-300 hover:border-zinc-400 disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate codes */}
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="font-bold">🎟️ Generate swag codes</h2>
          <form onSubmit={generate} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select name="type" defaultValue="gift" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white">
              <option value="gift">Gift</option>
              <option value="membership">Membership</option>
              <option value="tokens">Tokens</option>
            </select>
            <input name="value" required list="swag-values" placeholder="teddy / gold / 50" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white" />
            <datalist id="swag-values">
              <option value="teddy" /><option value="golden_roses" /><option value="jewelry" />
              <option value="champagne" /><option value="gift_basket" />
              <option value="gold" /><option value="platinum" /><option value="diamond" />
              <option value="20" /><option value="50" /><option value="100" />
            </datalist>
            <input name="count" type="number" min={1} max={100} defaultValue={1} className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white" />
            <input name="notes" placeholder="notes (optional)" className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white sm:col-span-4" />
            <button
              type="submit"
              disabled={busy}
              className="col-span-2 rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton disabled:opacity-40 sm:col-span-4"
            >
              Generate
            </button>
          </form>
        </div>

        {/* Announcement — the floor marquee */}
        <div className="mt-6 rounded-xl border border-gold/30 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">📢 Floor announcement</h2>
            <button
              onClick={clearAnnounce}
              disabled={busy}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-zinc-400 disabled:opacity-40"
            >
              Clear it
            </button>
          </div>
          {announcement && (
            <p className="mt-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm text-gold">
              Live now: “{announcement.message}” ·{' '}
              <span className="uppercase">{announcement.display_style}</span> ·{' '}
              {announcement.ends_at
                ? `until ${new Date(announcement.ends_at).toLocaleString()}`
                : 'until cleared'}
            </p>
          )}
          <form onSubmit={postAnnounce} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              name="message"
              required
              placeholder="Tonight: Rooftop at 11 — dress to impress"
              className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white sm:col-span-4"
            />
            <select name="style" defaultValue="scroll" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white">
              <option value="scroll">Ticker (right→left)</option>
              <option value="roll">Roll up</option>
              <option value="fade">Fade</option>
            </select>
            <input
              name="hours"
              type="number"
              min={0}
              placeholder="hours (0 = until cleared)"
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="col-span-2 rounded-lg bg-gold px-6 py-2.5 font-bold text-black transition hover:bg-gold/80 disabled:opacity-40"
            >
              Post it
            </button>
          </form>
        </div>

        {/* Model switch — failover without a redeploy */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="font-bold">🤖 Model switch</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Swap a down model in seconds. Keys stay in env — this only
            changes which model is called.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Cast (floor chat)
              </span>
              <input
                value={castModel}
                onChange={(e) => setCastModel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 font-mono text-sm text-white"
              />
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {['deepseek-chat', 'deepseek-reasoner'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setCastModel(m)}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-gold hover:text-gold"
                  >
                    {m}
                  </button>
                ))}
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Watchdog (image review)
              </span>
              <input
                value={watchdogModel}
                onChange={(e) => setWatchdogModel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 font-mono text-sm text-white"
              />
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  'nvidia/nemotron-nano-12b-v2-vl:free',
                  'qwen/qwen2.5-vl-72b-instruct',
                  'meta-llama/llama-3.2-90b-vision-instruct'
                ].map((m) => (
                  <button
                    key={m}
                    onClick={() => setWatchdogModel(m)}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-gold hover:text-gold"
                  >
                    {m}
                  </button>
                ))}
              </span>
            </label>
          </div>
          <button
            onClick={saveModels}
            disabled={busy}
            className="mt-4 rounded-lg bg-club px-6 py-2.5 font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
          >
            Save models
          </button>
        </div>

        {/* Floor status — close a section */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="font-bold">🚧 Floor status</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Put a floor under construction — the elevators show the notice
            instead of the room.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { slug: 'silver', name: 'Silver' },
              { slug: 'gold', name: 'Gold' },
              { slug: 'platinum', name: 'Platinum' },
              { slug: 'diamond', name: 'Diamond' }
            ].map((f) => {
              const c = closures.find((x) => x.floor === f.slug);
              const closed = c && (!c.until || new Date(c.until) > new Date());
              return (
                <div
                  key={f.slug}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                >
                  <span
                    className={`w-20 font-bold capitalize ${
                      closed ? 'text-club' : 'text-white'
                    }`}
                  >
                    {f.name}
                  </span>
                  {closed ? (
                    <>
                      <span className="text-xs font-bold uppercase text-club">
                        🔧 under construction
                        {c.until
                          ? ` until ${new Date(c.until).toLocaleTimeString()}`
                          : ''}
                      </span>
                      <button
                        onClick={() => setFloor(f.slug, false, '', 0)}
                        disabled={busy}
                        className="ml-auto rounded border border-zinc-600 px-3 py-1 text-xs font-bold text-zinc-300 hover:border-zinc-400 disabled:opacity-40"
                      >
                        Reopen
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        name={`reason-${f.slug}`}
                        id={`reason-${f.slug}`}
                        placeholder="reason (optional)"
                        className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                      />
                      <input
                        name={`hours-${f.slug}`}
                        id={`hours-${f.slug}`}
                        type="number"
                        min={0}
                        placeholder="hrs"
                        className="w-14 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          const reason = (
                            document.getElementById(
                              `reason-${f.slug}`
                            ) as HTMLInputElement | null
                          )?.value;
                          const hours = Number(
                            (
                              document.getElementById(
                                `hours-${f.slug}`
                              ) as HTMLInputElement | null
                            )?.value ?? 0
                          );
                          setFloor(f.slug, true, reason ?? '', hours);
                        }}
                        disabled={busy}
                        className="rounded bg-club px-3 py-1 text-xs font-bold text-white hover:bg-club-cotton disabled:opacity-40"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unpurchased memberships */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">🪪 Verified, no card yet</h2>
          {unpurchased.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              Everyone verified has a card. Quiet night at the exchange.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unpurchased.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
                >
                  <p className="font-bold text-white">
                    {p.display_name ?? 'Unnamed member'}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Verified{' '}
                    {p.verified_at
                      ? new Date(p.verified_at).toLocaleDateString()
                      : '—'}{' '}
                    · no card
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grant directly */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="font-bold">🎁 Grant directly (no code)</h2>
          <form onSubmit={grantDirect} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input name="email" required type="email" placeholder="member@email.com" className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white sm:col-span-2" />
            <select name="type" defaultValue="tokens" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white">
              <option value="tokens">Tokens</option>
              <option value="membership">Membership</option>
              <option value="gift">Gift</option>
            </select>
            <input name="value" required placeholder="100 / gold / teddy" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white" />
            <input name="days" type="number" min={1} defaultValue={30} title="Membership days" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white" />
            <input name="reason" placeholder="reason (optional)" className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white" />
            <button type="submit" disabled={busy} className="col-span-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40 sm:col-span-4">
              Grant
            </button>
          </form>
        </div>

        {/* Rules */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">📋 The rule set</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Cast weekly cap</th>
                  <th className="px-4 py-2">Needs owner</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={`${r.benefit_type}:${r.benefit_value}`} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{label(r.benefit_type, r.benefit_value)}</td>
                    <td className="px-4 py-2">{r.owner_only ? '—' : r.weekly_limit ?? 'unlimited'}</td>
                    <td className="px-4 py-2">{r.owner_only ? '🔒 owner' : 'cast ok'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Events on the floor — who's in, what's running */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">📅 Events on the floor</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {events.length === 0 && (
              <p className="text-sm text-zinc-500">
                Nothing scheduled in the next 6 hours.
              </p>
            )}
            {events.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
              >
                <p className="text-sm font-bold capitalize text-white">
                  {e.kind.replace(/_/g, ' ')} · {e.floor}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(e.starts_at).toLocaleString()} · {e.token_cost}{' '}
                  tokens · {e.entrants} in ·{' '}
                  <span className="uppercase">{e.status}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Loot ledger — the token flow */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">🪙 Loot ledger</h2>
          <div className="mt-3 space-y-1.5">
            {ledger.length === 0 && (
              <p className="text-sm text-zinc-500">No movement yet.</p>
            )}
            {ledger.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm"
              >
                <span
                  className={`font-bold ${
                    r.delta > 0 ? 'text-emerald-400' : 'text-club'
                  }`}
                >
                  {r.delta > 0 ? `+${r.delta}` : r.delta} tokens
                </span>
                <span className="text-xs text-zinc-500">
                  {r.reason}
                  {r.ref ? ` · ${String(r.ref).slice(0, 18)}` : ''}
                </span>
                <span className="text-xs text-zinc-600">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gift shop catalog — quick look */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">🎁 Gift shop catalog</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {catalog.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-center"
              >
                <p className="text-2xl">{g.emoji}</p>
                <p className="mt-1 text-xs font-bold text-white">{g.name}</p>
                <p className="text-xs text-zinc-500">{g.token_cost} tokens</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent codes + grants */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-bold">🎟️ Recent codes</h2>
            <div className="mt-3 space-y-2">
              {codes.length === 0 && <p className="text-sm text-zinc-500">None yet.</p>}
              {codes.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm">
                  <div>
                    <button onClick={() => copy(c.code)} className="font-mono text-club hover:underline" title="Copy">
                      {c.code}
                    </button>
                    <span className="ml-2 text-zinc-500">
                      {label(c.benefit_type, c.benefit_value)} · {c.actor_type}
                      {c.actor_ref ? `/${c.actor_ref}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {c.used_count}/{c.max_uses} used
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold">📜 Recent grants</h2>
            <div className="mt-3 space-y-2">
              {grants.length === 0 && <p className="text-sm text-zinc-500">None yet.</p>}
              {grants.map((g) => (
                <div key={g.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm">
                  <p>
                    <span className="font-bold">{g.profiles?.display_name ?? 'a member'}</span>{' '}
                    got <span className="text-club">{label(g.benefit_type, g.benefit_value)}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {g.reason} · {g.actor_type}
                    {g.actor_ref ? `/${g.actor_ref}` : ''} · {new Date(g.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The Mint — right-hand drawer that prints what the member needs */}
        {mintOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setMintOpen(false)}
          >
            <div
              className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold">⚒️ The Mint</h2>
                <button
                  onClick={() => setMintOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Pick what a member needs — one code prints it all.
              </p>

              {/* Presets */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-gold hover:text-gold"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Bundle builder */}
              <div className="mt-5 space-y-2">
                {mintRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <select
                      value={row.kind}
                      onChange={(e) =>
                        setMintRow(row.id, {
                          kind: e.target.value as 'tokens' | 'gift' | 'membership'
                        })
                      }
                      className="w-28 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-white"
                    >
                      <option value="tokens">Tokens</option>
                      <option value="gift">Gift</option>
                      <option value="membership">Card</option>
                    </select>
                    <input
                      value={row.value}
                      onChange={(e) => setMintRow(row.id, { value: e.target.value })}
                      list="mint-values"
                      placeholder={
                        row.kind === 'gift'
                          ? 'teddy'
                          : row.kind === 'membership'
                            ? 'gold'
                            : '5'
                      }
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white"
                    />
                    <button
                      onClick={() => removeMintRow(row.id)}
                      className="text-zinc-600 hover:text-club"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <datalist id="mint-values">
                  <option value="teddy" />
                  <option value="golden_roses" />
                  <option value="jewelry" />
                  <option value="champagne" />
                  <option value="gift_basket" />
                  <option value="gold" />
                  <option value="platinum" />
                  <option value="diamond" />
                </datalist>
                <button
                  onClick={addMintRow}
                  className="text-xs font-bold text-club hover:text-club-cotton"
                >
                  + Add a benefit
                </button>
              </div>

              {/* Count + notes */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={mintCount}
                  onChange={(e) => setMintCount(Number(e.target.value) || 1)}
                  title="How many codes"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white"
                />
                <input
                  value={mintNotes}
                  onChange={(e) => setMintNotes(e.target.value)}
                  placeholder="notes (optional)"
                  className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-white"
                />
              </div>

              <button
                onClick={printMint}
                disabled={busy}
                className="mt-4 w-full rounded-lg bg-gold px-6 py-3 font-extrabold text-black transition hover:bg-gold/80 disabled:opacity-40"
              >
                🖨️ Print {mintCount > 1 ? `${mintCount} ` : ''}code
                {mintCount > 1 ? 's' : ''}
              </button>

              {mintFresh.length > 0 && (
                <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
                    Printed — hand these out
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mintFresh.map((c) => (
                      <button
                        key={c}
                        onClick={() => copy(c)}
                        title="Click to copy"
                        className="rounded-md border border-emerald-500/40 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-emerald-300 hover:border-emerald-400"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
