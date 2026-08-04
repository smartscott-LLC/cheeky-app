'use client';

import { useEffect, useState } from 'react';
import {
  ownerFetchState,
  ownerGenerateCodes,
  ownerGrantDirect,
  ownerResolveFlag,
  ownerToggleEngine,
  ownerPostAnnouncement
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
