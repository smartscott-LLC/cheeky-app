import 'server-only';

import Stripe from 'stripe';

// Server-side Stripe SDK. The dashboard is the source of truth for
// products/prices; the webhook syncs them into our DB.
// Built on first use — `new Stripe()` throws at import time when
// STRIPE_SECRET_KEY is absent, which breaks `next build`'s page-data
// collection. Callers still use `stripe` directly; the Proxy defers
// construction until a method is actually touched.
let instance: Stripe | null = null;

function getInstance(): Stripe {
  if (!instance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY env var');
    instance = new Stripe(key, {
      appInfo: {
        name: 'Club Cheeky',
        version: '0.1.0',
        url: 'https://smartscott.online'
      }
    });
  }
  return instance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getInstance();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
