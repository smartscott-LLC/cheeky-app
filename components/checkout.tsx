'use client';

import { useCallback } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { startCheckoutSession } from '@/app/actions/stripe';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function Checkout({
  priceId,
  onComplete
}: {
  priceId: string;
  onComplete?: () => void;
}) {
  const fetchClientSecret = useCallback(async () => {
    const res = await startCheckoutSession(priceId);
    if (res.error) throw new Error(res.error);
    return res.clientSecret!;
  }, [priceId]);

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret, onComplete }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
