'use client';

import { useState } from 'react';
import { sendGuestPassByEmail } from '@/app/account/actions';

export default function GuestPassForm() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ error?: string; ok?: boolean } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setResult(null);
    const res = await sendGuestPassByEmail(email.trim());
    setBusy(false);
    if (res.error) {
      setResult({
        error:
          res.error === 'pass_requires_membership'
            ? 'Guest passes need a paid membership. Gold, Platinum, or Diamond only.'
            : res.error === 'user not found'
              ? 'No member with that email yet — invite them to sign up first.'
              : 'Could not send the pass. Try again.'
      });
    } else {
      setResult({ ok: true });
    }
    setEmail('');
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-xl font-bold">Guest pass</h2>
      <p className="mt-1 text-sm text-cyan">
        Bring a friend up to your floor for 24 hours. They see the club from
        your seats — and your tier gets them in.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="flex-1 rounded-lg bg-zinc-800 p-3 text-sm text-white outline-none ring-club/50 focus:ring-2"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-club px-5 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
        >
          {busy ? 'Sending…' : 'Send pass'}
        </button>
      </div>
      {result?.error && (
        <p className="mt-3 text-sm text-club">{result.error}</p>
      )}
      {result?.ok && (
        <p className="mt-3 text-sm text-emerald-400">
          Pass sent — they have 24 hours upstairs.
        </p>
      )}
    </div>
  );
}
