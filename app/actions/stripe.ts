'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';

/**
 * Creates an embedded Checkout Session for a real price from our synced
 * catalog (never fabricated price_data — Stripe's rule). Handles both
 * subscriptions (memberships) and one-time purchases (token packs).
 */
export async function startCheckoutSession(
  priceId: string
): Promise<{ clientSecret?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  // The card IS verification — no purchases before the Door Check.
  const { data: profile } = await supabase
    .from('profiles')
    .select('verified_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.verified_at) {
    return { error: 'verification_required' };
  }

  // The real price from the DB (synced from Stripe via webhook).
  const { data: price } = await supabase
    .from('prices')
    .select('id, interval_count')
    .eq('id', priceId)
    .maybeSingle();
  if (!price) {
    return { error: 'price not found' };
  }

  let customer: string;
  try {
    customer = await createOrRetrieveCustomer({
      uuid: user.id,
      email: user.email || ''
    });
  } catch (err) {
    console.error(err);
    return { error: 'unable to access customer record' };
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    mode: price.interval_count ? 'subscription' : 'payment',
    allow_promotion_codes: true
  });

  return { clientSecret: session.client_secret ?? undefined };
}
