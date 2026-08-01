// One-off diagnostic: replays a fabricated identity.verification_session.verified
// event to the production webhook with a locally-computed Stripe signature.
// If the signature validates, the deployed handler runs for the given user —
// which, for a real user id, actually completes their verification.
// Usage: node scripts/test-webhook.mjs <whsec> <userId>
import { createHmac } from 'node:crypto';

const [secret, userId] = process.argv.slice(2);
if (!secret || !userId) {
  console.error('Usage: node scripts/test-webhook.mjs <whsec> <userId>');
  process.exit(1);
}

const body = JSON.stringify({
  id: 'evt_manual_replay',
  object: 'event',
  api_version: '2026-06-24.dahlia',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'vs_manual_replay',
      object: 'identity.verification_session',
      status: 'verified',
      metadata: { supabaseUUID: userId }
    }
  },
  livemode: true,
  type: 'identity.verification_session.verified'
});

const timestamp = Math.floor(Date.now() / 1000);
const hmac = createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

const res = await fetch('https://smartscott.online/api/webhooks', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'stripe-signature': `t=${timestamp},v1=${hmac}`
  },
  body
});

console.log('Status:', res.status);
console.log('Response:', await res.text());
