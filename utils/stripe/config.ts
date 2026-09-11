import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

const stripeConfig: Stripe.StripeConfig = {
  // https://github.com/stripe/stripe-node#configuration
  // https://stripe.com/docs/api/versioning
  // @ts-ignore
  apiVersion: null,
  // Register this as an official Stripe plugin.
  // https://stripe.com/docs/building-plugins#setappinfo
  appInfo: {
    name: 'Club Cheeky',
    version: '0.1.0',
    url: 'https://smartscott.online'
  }
};

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY ?? '';
    if (!key) {
      throw new Error('Missing STRIPE_SECRET_KEY env var');
    }
    stripeInstance = new Stripe(key, stripeConfig);
  }
  return stripeInstance;
}
