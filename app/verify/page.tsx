import VerificationPanel from '@/components/ui/Verification/VerificationPanel';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getTokenBalance } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';

export default async function VerifyPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  const { error } = await searchParams;
  const [profile, tokenBalance] = await Promise.all([
    getProfile(supabase, user.id),
    getTokenBalance(supabase)
  ]);

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
          />
        </div>
      </div>
    </div>
  );
}
