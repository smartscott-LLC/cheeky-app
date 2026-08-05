'use client';

import Button from '@/components/ui/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { createStripePortal } from '@/utils/stripe/server';
import Link from 'next/link';
import { Tables } from '@/types_db';

type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

interface Props {
  subscription: SubscriptionWithPriceAndProduct | null;
  tier: string;
  tierLabel: string;
}

/**
 * Membership card — sits near the top of Account, next to the card.
 * Frame it as boosting your chances, never "subscribe to a plan" and never
 * "access" (you're never locked out — the free floor stays fun).
 */
export default function CustomerPortalForm({
  subscription,
  tier,
  tierLabel
}: Props) {
  const router = useRouter();
  const currentPath = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription?.prices?.currency!,
      minimumFractionDigits: 0
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true);
    const redirectUrl = await createStripePortal(currentPath);
    setIsSubmitting(false);
    return router.push(redirectUrl);
  };

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">Membership</h2>
          {subscription ? (
            <p className="mt-1 text-zinc-400">
              Your {subscription.prices?.products?.name} plan is active —{' '}
              <span className="font-semibold text-gold">
                {subscriptionPrice}/{subscription.prices?.interval}
              </span>
              . Cancel anytime, one click, no scripts.
            </p>
          ) : tier !== 'standard' ? (
            <p className="mt-1 text-zinc-400">
              Your <span className="font-semibold text-gold">{tierLabel}</span>{' '}
              membership is active.
            </p>
          ) : (
            <p className="mt-1 text-zinc-400">
              You&apos;re on the Silver floor — free, and it stays fun. When you
              want the view from up top, the memberships are waiting.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {subscription ? (
            <Button
              variant="slim"
              onClick={handleStripePortalRequest}
              loading={isSubmitting}
            >
              Manage billing
            </Button>
          ) : tier === 'standard' ? (
            <Link
              href="/#membership"
              className="rounded-lg bg-club px-6 py-2.5 text-sm font-extrabold uppercase tracking-[0.1em] text-white transition hover:bg-club-cotton"
            >
              See the memberships
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
