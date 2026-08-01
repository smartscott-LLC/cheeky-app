'use client';

import { startVerification } from '@/app/verify/actions';
import type { Tables } from '@/types_db';

type Profile = Tables<'profiles'>;

interface VerificationPanelProps {
  profile: Profile | null;
  tokenBalance: number;
  error?: string;
}

export default function VerificationPanel({
  profile,
  tokenBalance,
  error
}: VerificationPanelProps) {
  const verified = Boolean(profile?.verified_at);

  if (verified) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-club text-3xl">
          ✓
        </div>
        <h2 className="mt-6 text-3xl font-extrabold">You&apos;re in.</h2>
        <p className="mt-3 text-zinc-400">
          Brutus cleared you. Your Silver card is live — VIP badge active, and
          your welcome tokens are on your tab.
        </p>
        <p className="mt-6 rounded-lg bg-zinc-900 px-4 py-3 text-xl font-bold text-club">
          {tokenBalance} tokens
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          The Dance Floor opens every hour on the hour. It&apos;s a 3-token
          entry — don&apos;t sleep on the next one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-club text-2xl">
          💪
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">Brutus the Bouncer</h2>
          <p className="text-sm text-zinc-400">The Door Check</p>
        </div>
      </div>

      <p className="mt-6 text-zinc-300">
        Everyone&apos;s a VIP here — but everybody checks in at the door.
        It&apos;s quick and painless: name, date of birth, and your government ID
        number. Brutus runs it against the records, stamps your card, and you
        get <span className="font-bold text-club">20 tokens</span> on the spot.
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        Your ID number is processed by Stripe and never stored by us.
      </p>

      {error === 'consent' && (
        <p className="mt-4 rounded-md border border-club/50 bg-club/10 px-3 py-2 text-sm text-club">
          Brutus needs your OK before he checks your ID. Check the box below.
        </p>
      )}

      <form action={startVerification} className="mt-6 space-y-4">
        <label className="flex items-start gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="verificationConsent"
            required
            className="mt-1 h-4 w-4 accent-club"
          />
          <span>
            I consent to identity verification via Stripe Identity. My name,
            date of birth, and government ID number are checked against
            government and third-party databases, and are never stored by
            Cheeky. (Verification policy v1)
          </span>
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-club px-6 py-3 text-lg font-bold text-white transition hover:bg-club-cotton"
        >
          Start the check
        </button>
      </form>
    </div>
  );
}
