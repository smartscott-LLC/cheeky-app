import Link from 'next/link';
import Pricing from '@/components/ui/Pricing/Pricing';
import JoinCTA from '@/components/ui/JoinCTA/JoinCTA';
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
      {/* Floating Join for Free CTA */}
      <JoinCTA verified={Boolean(profile?.verified_at)} />
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

        {/* Rate limits + token grants breakdown */}
        <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h2 className="font-header text-cyan text-xl text-center">
            What each tier gets you
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-body text-club text-center">
            All memberships include verified access, lounge chat, and AI crew
            members. Higher tiers unlock more daily actions and bonus tokens.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gold bg-zinc-900/60 p-4">
              <p className="font-body text-club text-xs font-bold uppercase tracking-wide">
                Silver — free
              </p>
              <p className="mt-2 text-sm font-body text-club">
                30 msgs · 5 people · 15 swipes · 4 L³ · 3 matchmaker · 0 blind
                date · 5 icebreakers ·{' '}
                <strong className="text-cyan">No tokens</strong>
              </p>
            </div>
            <div className="rounded-lg border border-gold bg-zinc-900/60 p-4">
              <p className="font-body text-club text-xs font-bold uppercase tracking-wide">
                Gold — $9.99/mo
              </p>
              <p className="mt-2 text-sm font-body text-club">
                75 msgs · 15 people · 30 swipes · 8 L³ · 5 matchmaker · 2 blind
                date · 10 icebreakers ·{' '}
                <strong className="text-cyan">+50 tokens</strong>
              </p>
            </div>
            <div className="rounded-lg border border-gold bg-zinc-900/60 p-4">
              <p className="font-body text-club text-xs font-bold uppercase tracking-wide">
                Platinum — $19.99/mo
              </p>
              <p className="mt-2 text-sm font-body text-club">
                ∞ msgs · 40 people · 50 swipes · 12 L³ · 8 matchmaker · 2 blind
                date · ∞ icebreakers ·{' '}
                <strong className="text-cyan">+150 tokens</strong>
              </p>
            </div>
            <div className="rounded-lg border border-gold bg-zinc-900/60 p-4">
              <p className="font-body text-club text-xs font-bold uppercase tracking-wide">
                Diamond — $29.99/mo
              </p>
              <p className="mt-2 text-sm font-body text-club">
                ∞ msgs · 100 people · 100 swipes · 20 L³ · 12 matchmaker · 2
                blind date · ∞ icebreakers ·{' '}
                <strong className="text-cyan">+500 tokens</strong>
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs font-body text-club text-center">
            All daily limits reset at midnight CST. Tokens never expire while
            your subscription is active. Tokens power events and gifts only —
            never messaging.
          </p>
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
