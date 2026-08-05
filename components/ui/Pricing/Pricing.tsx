'use client';

import Button from '@/components/ui/Button';
import LogoCloud from '@/components/ui/LogoCloud';
import type { Tables } from '@/types_db';
import { User } from '@supabase/supabase-js';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Stripe's embedded checkout loads only when a member actually picks a
// price — 265 KiB of third-party JS stays off the landing page otherwise.
const Checkout = dynamic(() => import('@/components/checkout'), {
  ssr: false
});

type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;
interface ProductWithPrices extends Product {
  prices: Price[];
}
interface PriceWithProduct extends Price {
  products: Product | null;
}
interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
  verified: boolean;
}

type BillingInterval = 'lifetime' | 'year' | 'month';

export default function Pricing({
  user,
  products,
  subscription,
  verified
}: Props) {
  const intervals = Array.from(
    new Set(
      products.flatMap((product) =>
        product?.prices?.map((price) => price?.interval)
      )
    )
  );
  const router = useRouter();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('month');
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);

  const handleSelect = (price: Price) => {
    if (!user) {
      return router.push('/signin/signup');
    }
    if (!verified) {
      // The card IS verification — get through the door first.
      return router.push('/verify');
    }
    setSelectedPrice(price);
  };

  if (!products.length) {
    return (
      <section className="bg-black">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            No subscription pricing plans found. Create them in your{' '}
            <a
              className="text-club underline"
              href="https://dashboard.stripe.com/products"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe Dashboard
            </a>
            .
          </p>
        </div>
        <LogoCloud />
      </section>
    );
  } else {
    return (
      <section className="bg-black">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
              Get your card
            </h1>
            <p className="max-w-2xl m-auto mt-5 text-xl text-cyan sm:text-center sm:text-2xl">
              Everyone gets in with a verified ID — free. Expand your options by
              obtaining membership to the higher floors.
            </p>
            <div className="relative self-center mt-6 bg-zinc-900 rounded-lg p-0.5 flex sm:mt-8 border border-zinc-800">
              {intervals.includes('month') && (
                <button
                  onClick={() => setBillingInterval('month')}
                  type="button"
                  className={`${
                    billingInterval === 'month'
                      ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                      : 'ml-0.5 relative w-1/2 border border-transparent text-cyan'
                  } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-club focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                >
                  Monthly billing
                </button>
              )}
              {intervals.includes('year') && (
                <button
                  onClick={() => setBillingInterval('year')}
                  type="button"
                  className={`${
                    billingInterval === 'year'
                      ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                      : 'ml-0.5 relative w-1/2 border border-transparent text-cyan'
                  } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-club focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                >
                  Yearly billing
                </button>
              )}
            </div>
          </div>
          <div className="mt-12 space-y-0 sm:mt-16 flex flex-wrap justify-center gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {products.map((product) => {
              const price = product?.prices?.find(
                (p) => p.interval === billingInterval || p.type === 'one_time'
              );
              if (!price) return null;
              const priceString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: price.currency!,
                minimumFractionDigits: 0
              }).format((price?.unit_amount || 0) / 100);
              return (
                <div
                  key={product.id}
                  className={cn(
                    'flex flex-col rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900',
                    {
                      'border border-club': subscription
                        ? product.name === subscription?.prices?.products?.name
                        : product.name === 'Standard Membership'
                    },
                    'flex-1', // This makes the flex item grow to fill the space
                    'basis-1/3', // Assuming you want each card to take up roughly a third of the container's width
                    'max-w-xs' // Sets a maximum width to the cards to prevent them from getting too large
                  )}
                >
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold leading-6 text-white">
                      {product.name}
                    </h2>
                    <p className="mt-4 text-cyan">{product.description}</p>
                    <p className="mt-8">
                      <span className="text-5xl font-extrabold white">
                        {priceString}
                      </span>
                      <span className="text-base font-medium text-cyan">
                        {price.type === 'recurring'
                          ? `/${billingInterval}`
                          : ' one-time'}
                      </span>
                    </p>
                    <Button
                      variant="slim"
                      type="button"
                      onClick={() =>
                        subscription
                          ? router.push('/account')
                          : handleSelect(price)
                      }
                      className="block w-full py-2 mt-8 text-sm font-semibold text-center text-white rounded-md hover:bg-zinc-900"
                    >
                      {subscription
                        ? 'Manage'
                        : product.name === 'Standard Membership'
                          ? 'Get Silver Card'
                          : price.type === 'one_time'
                            ? 'Buy'
                            : 'Join'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Messaging is the room, never a product. */}
          <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-3xl">💬</p>
            <h2 className="mt-3 text-xl font-extrabold">
              Messaging is never for sale
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-club">
              You can&apos;t buy more messages. No message packs, no upsells, no
              pay-to-talk — ever. Messaging is a membership perk, not a product:
              it&apos;s the room you&apos;re in, and every card gets in.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-silver">
                  Silver — free
                </p>
                <p className="mt-1 text-sm text-cyan">
                  30 messages + 5 new conversations a day. Generous on purpose,
                  never shrunk.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gold">
                  Gold
                </p>
                <p className="mt-1 text-sm text-cyan">
                  75 messages + 15 new people a day.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-platinum">
                  Platinum
                </p>
                <p className="mt-1 text-sm text-cyan">
                  Unlimited messages + 40 new people a day.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-diamond">
                  Diamond
                </p>
                <p className="mt-1 text-sm text-cyan">
                  Unlimited messages + 100 new people a day.
                </p>
              </div>
            </div>
            <p className="mt-5 text-xs text-club">
              Tokens power events and gifts only — never messaging.
            </p>
          </div>

          {selectedPrice && (
            <div className="mx-auto mt-12 max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
                  Checkout
                </p>
                <button
                  onClick={() => setSelectedPrice(null)}
                  className="text-sm text-cyan hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <Checkout
                priceId={selectedPrice.id}
                onComplete={() => {
                  setSelectedPrice(null);
                  router.refresh();
                }}
              />
            </div>
          )}
          <LogoCloud />
        </div>
      </section>
    );
  }
}
