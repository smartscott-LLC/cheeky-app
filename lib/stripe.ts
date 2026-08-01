import 'server-only';

import Stripe from 'stripe';

// Server-side Stripe SDK. The dashboard is the source of truth for
// products/prices; the webhook syncs them into our DB.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  appInfo: {
    name: 'Cheeky',
    version: '0.1.0',
    url: 'https://smartscott.online'
  }
});
