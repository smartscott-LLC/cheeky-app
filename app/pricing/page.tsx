import Link from 'next/link';
import Pricing from '@/components/ui/Pricing/Pricing';
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser,
  getProfile
} from '@/utils/supabase/queries';

export default async function PricingPage() {
  const supabase = await createClient();
  const [user, products, subscription] = await Promise.all([
    getUser(supabase),
    getProducts(supabase),
    getSubscription(supabase)
  ]);
  const profile = user ? await getProfile(supabase, user.id) : null;

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-hero text-gold text-center text-3xl sm:text-4xl">
          💎 Membership & Pricing
        </h1>
        <p className="font-header mx-auto mt-3 max-w-xl text-center text-cyan">
          The only price of admission is being a real person. Money buys floors,
          never entry — the free tier is genuinely free.
        </p>

        <div className="mt-12">
          <Pricing
            user={user}
            products={products ?? []}
            subscription={subscription}
            verified={Boolean(profile?.verified_at)}
          />
        </div>

        <p className=" mx-auto mt-8 max-w-xl text-center text-xs font-body text-club">
          Cancel anytime in one click from your Account page — no phone calls,
          no retention scripts, no surprise charges. Tokens are never spent on
          messaging; they power events and gifts only.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/#membership"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5  font-body text-club transition hover:bg-club/10"
          >
            ← Back to the club
          </Link>
        </div>
      </div>
    </div>
  );
}
