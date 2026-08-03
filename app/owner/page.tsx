'use client';

import { useState } from 'react';
import {
  ownerFetchState,
  ownerGenerateCodes,
  ownerGrantDirect,
  ownerResolveFlag,
  ownerToggleEngine
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
const label = (t: string, v: string) =>
  t === 'gift' ? (GIFT_LABEL[v] ?? v) : t === 'membership' ? `${v} membership` : `${v} tokens`;

export default function OwnerPage() {
  const [key, setKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [engine, setEngine] = useState(true);
  const [rules, setRules] = useState<Rule[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);

  const notice = (ok: boolean, text: string) => setMsg({ ok, text });

  const unlock = async () => {
    setBusy(true);
    const res = await ownerFetchState({ key });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    setEngine(res.engineEnabled ?? true);
    setRules((res.rules ?? []) as Rule[]);
    setCodes((res.codes ?? []) as CodeRow[]);
    setGrants((res.grants ?? []) as GrantRow[]);
    setFlags((res.flags ?? []) as FlagRow[]);
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
    }
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

  const resolveFlag = async (flagId: string, action: 'grant' | 'dismiss') => {
    setBusy(true);
    const res = await ownerResolveFlag({ key, flagId, action });
    setBusy(false);
    if (res.error) return notice(false, res.error);
    notice(true, action === 'grant' ? 'Flag granted — member got it' : 'Flag dismissed');
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
            onKeyDown={(e) => e.key === 'Enter' && unlock()}
            placeholder="Owner key"
            className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:ring-2 focus:ring-club/50"
          />
          <button
            onClick={unlock}
            disabled={busy || !key}
            className="mt-3 w-full rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
          >
            Unlock
          </button>
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
            <h1 className="text-3xl font-extrabold">🗝️ The Owner&apos;s Booth</h1>
            <p className="mt-1 text-sm text-zinc-500">The Swag Shop&apos;s front desk.</p>
          </div>
          <button
            onClick={toggleEngine}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              engine ? 'bg-emerald-600 text-white' : 'bg-club text-white'
            }`}
          >
            {engine ? '● Engine ON' : '● Engine OFF'}
          </button>
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
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => resolveFlag(f.id, 'grant')}
                      disabled={busy}
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Grant it
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
      </div>
    </div>
  );
}
