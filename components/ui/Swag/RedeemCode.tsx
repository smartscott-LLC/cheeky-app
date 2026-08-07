'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { redeemSwagCode } from '@/app/swag/actions';

const GIFT_LABEL: Record<string, string> = {
  teddy: '🧸 Stuffed Bear',
  golden_roses: '🌹 Golden Bouquet',
  jewelry: '💎 Jewelry',
  champagne: '🍾 Champagne',
  gift_basket: '🧺 The Gift Basket'
};

function describe(type: string, value: string): string {
  if (type === 'gift') return GIFT_LABEL[value] ?? value;
  if (type === 'membership') return `${value} membership`;
  return `${value} tokens`;
}

/** The code entry card — enter a code, get what's tied to it. */
export default function RedeemCode() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const submit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || busy) return;
    setBusy(true);
    setResult(null);
    const res = await redeemSwagCode(trimmed);
    setBusy(false);
    if (res.error) {
      setResult({
        ok: false,
        text:
          res.error === 'code_not_found'
            ? 'That code is not on the list. Check it and try again.'
            : res.error === 'code_used' || res.error === 'already_redeemed'
              ? 'That code has already been used.'
              : res.error === 'code_expired'
                ? 'That code has expired.'
                : 'That code could not be redeemed.'
      });
      return;
    }
    setCode('');
    setResult({
      ok: true,
      text: `You got ${describe(res.benefitType ?? '', res.benefitValue ?? '')}! Check your floor, wallet, or stash.`
    });
    router.refresh();
  };

  return (
    <div className="mt-8 rounded-xl border border-club/30 bg-club/5 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
        🎟️ Got a code?
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="SWAG-XXXXXXXX"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-base text-white uppercase outline-none focus:ring-2 focus:ring-club/50"
        />
        <button
          onClick={submit}
          disabled={busy || !code.trim()}
          className="rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton disabled:opacity-40"
        >
          {busy ? 'Redeeming…' : 'Redeem'}
        </button>
      </div>
      {result && (
        <p
          className={`mt-3 text-base ${result.ok ? 'text-emerald-400' : 'text-club'}`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
