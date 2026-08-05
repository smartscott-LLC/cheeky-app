import { redirect } from 'next/navigation';
import Link from 'next/link';
import StoreClient from '@/components/ui/Store/StoreClient';
import { createClient } from '@/utils/supabase/server';
import { getReturnFloor } from '@/utils/return-floor';
import {
  getProducts,
  getSubscription,
  getUser,
  getProfile,
  getTokenBalance
} from '@/utils/supabase/queries';

export default async function StorePage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const [products, subscription, profile, tokenBalance] = await Promise.all([
    getProducts(supabase),
    getSubscription(supabase),
    getProfile(supabase, user.id),
    getTokenBalance(supabase)
  ]);
  const floorHref = await getReturnFloor();

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <Link
          href={floorHref}
          className="text-sm font-semibold text-cyan hover:text-white"
        >
          ← Back to the floor
        </Link>
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🪙 The Exchange
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-cyan">
          Cards and tokens, right here on the floor — no need to leave the club.
        </p>

        <StoreClient
          products={(products ?? []).map((p) => ({
            id: p.id,
            name: p.name ?? '',
            description: p.description,
            prices: (p.prices ?? []).map((pr) => ({
              id: pr.id,
              type: pr.type,
              interval: pr.interval,
              unit_amount: pr.unit_amount,
              currency: pr.currency
            }))
          }))}
          subscriptionName={subscription?.prices?.products?.name ?? null}
          verified={Boolean(profile?.verified_at)}
          tokenBalance={tokenBalance}
        />
      </div>
    </div>
  );
}
