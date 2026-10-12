'use client';

import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import {
  SQUARE_MEMBERSHIPS_URL,
  SQUARE_TOKENS_URL
} from '@/utils/square-links';

interface StorePrice {
  id: string;
  interval_count: number | null;
  unit_amount: number | null;
  currency: string | null;
}

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  prices: StorePrice[];
}

interface Props {
  products: StoreProduct[];
  subscriptionName: string | null;
  verified: boolean;
  tokenBalance: number;
}

const TOKEN_RE = /token/i;

const money = (price: StorePrice) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency ?? 'usd',
    minimumFractionDigits: 0
  }).format((price.unit_amount ?? 0) / 100);

export default function StoreClient({
  products,
  subscriptionName,
  verified,
  tokenBalance
}: Props) {
  const router = useRouter();

  const memberships = products.filter((p) => !TOKEN_RE.test(p.name));
  const tokenPacks = products
    .filter((p) => TOKEN_RE.test(p.name))
    .flatMap((p) =>
      p.prices
        .filter((pr) => !pr.interval_count)
        .map((pr) => ({ productName: p.name, ...pr }))
    );

  // Square's online store is the register — the club opens the right
  // aisle; the webhook does the granting when the order lands.
  const toStore = (url: string) => {
    if (!verified) {
      // The card IS verification — get through the door first.
      return router.push('/verify');
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-10 space-y-14">
      {!verified && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 text-center">
          <p className="font-body text-club text-sm font-semibold">
            The card comes before the cash — pass the Door Check first.
            It&apos;s free, and takes two minutes.
          </p>
          <Button
            variant="slim"
            onClick={() => router.push('/verify')}
            className="mt-3 inline-block"
          >
            Get verified
          </Button>
        </div>
      )}

      {/* Cards */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-header text-cyan text-xl">💳 Your card</h2>
          <p className="text-sm font-body text-club">
            Your tab:{' '}
            <span className="font-bold font-body text-club">
              {tokenBalance} tokens
            </span>
          </p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {memberships.map((product) => {
            const price =
              product.prices.find((p) => p.interval_count) ?? product.prices[0];
            if (!price) return null;
            const isCurrent = subscriptionName === product.name;
            return (
              <div
                key={product.id}
                className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-6"
              >
                <h3 className="font-header text-cyan text-lg">
                  {product.name}
                </h3>
                <p className="mt-1 flex-1 text-sm font-body text-club">
                  {product.description}
                </p>
                <p className="font-body text-club mt-4">
                  <span className="text-3xl font-extrabold text-white">
                    {money(price)}
                  </span>
                  <span className="ml-1 text-sm text-cyan">/mo</span>
                </p>
                <Button
                  variant="slim"
                  onClick={() =>
                    isCurrent
                      ? router.push('/account')
                      : toStore(SQUARE_MEMBERSHIPS_URL)
                  }
                  className="mt-5 block w-full"
                >
                  {isCurrent
                    ? 'Manage'
                    : product.name === 'Standard Membership'
                      ? 'Get Silver Card'
                      : 'Get this card'}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tokens */}
      {tokenPacks.length > 0 && (
        <section>
          <h2 className="font-header text-cyan text-xl">🪙 Tokens</h2>
          <p className="mt-1 text-sm font-body text-club">
            Fuel the Dance Floor, events, and gifts. Never messaging.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tokenPacks.map((pack) => (
              <div
                key={pack.id}
                className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-6"
              >
                <h3 className="font-header text-cyan text-lg">
                  {pack.productName.replace(
                    /^Cheeky Token (Bag|Bundle) - /i,
                    ''
                  )}
                </h3>
                <p className="mt-4 text-3xl font-extrabold font-body text-club">
                  {money(pack)}
                </p>
                <Button
                  variant="slim"
                  onClick={() => toStore(SQUARE_TOKENS_URL)}
                  className="mt-5 block w-full"
                >
                  Buy tokens
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
