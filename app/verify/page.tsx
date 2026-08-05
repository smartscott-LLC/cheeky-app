import CheckInForm from '@/components/ui/Verification/CheckInForm';
import VerificationPanel from '@/components/ui/Verification/VerificationPanel';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getTokenBalance } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';

export default async function VerifyPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; checked?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error, checked } = await searchParams;

  // Just finished the ID check, not signed in yet: one email hoop to go.
  if (!user && checked === '1') {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-5xl">📧</p>
          <h1 className="mt-6 text-3xl font-extrabold">
            You&apos;re checked in — one email to go
          </h1>
          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            Your ID passed. Now open the confirmation email we sent and click
            the link — it drops you straight into the lobby, card in hand.
          </p>
          <p className="mt-6 text-sm text-zinc-600">
            Didn&apos;t get it? Check spam, or sign in and resend the
            confirmation.
          </p>
        </div>
      </div>
    );
  }

  // Brand-new visitor: the one-stop door with Brutus — all four consents
  // and the account in one shot, then the ID check.
  if (!user) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
            Check in at the door
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
            Everyone&apos;s a VIP — but everybody checks in. One stop, then
            you&apos;re in.
          </p>
          <CheckInForm error={error} />
        </div>
      </div>
    );
  }

  // Signed in and verified — nothing left at the door.
  const [profile, tokenBalance, privateData] = await Promise.all([
    getProfile(supabase, user.id),
    getTokenBalance(supabase),
    supabase
      .from('profile_private')
      .select('verification_attempts, verification_escalated_at')
      .eq('id', user.id)
      .maybeSingle()
  ]);
  if (profile?.verified_at) {
    return redirect('/club');
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          Get your Silver card
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Free. Verified. Twenty tokens on the house the second you&apos;re in.
        </p>
        <div className="mt-10">
          <VerificationPanel
            profile={profile}
            tokenBalance={tokenBalance}
            error={error}
            verificationAttempts={
              privateData?.data?.verification_attempts ?? 0
            }
            escalated={Boolean(privateData?.data?.verification_escalated_at)}
          />
        </div>
      </div>
    </div>
  );
}
