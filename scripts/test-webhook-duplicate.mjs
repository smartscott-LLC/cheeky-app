// Replays the same fabricated Stripe webhook event twice to verify idempotency handling.
// Usage: node scripts/test-webhook-duplicate.mjs <whsec> <userId> [endpoint]

import { createHmac } from 'node:crypto';

const [secret, userId, endpoint = 'https://smartscott.online/api/webhooks'] =
  process.argv.slice(2);
if (!secret || !userId) {
  console.error(
    'Usage: node scripts/test-webhook-duplicate.mjs <whsec> <userId> [endpoint]'
  );
  process.exit(1);
}

const makeBody = () =>
  JSON.stringify({
    id: 'evt_manual_replay_duplicate',
    object: 'event',
    api_version: '2026-06-24.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'vs_manual_replay_duplicate',
        object: 'identity.verification_session',
        status: 'verified',
        metadata: { supabaseUUID: userId }
      }
    },
    livemode: true,
    type: 'identity.verification_session.verified'
  });

const sign = (body) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return { header: `t=${timestamp},v1=${hmac}`, timestamp };
};

const send = async (body) => {
  const { header } = sign(body);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': header
    },
    body
  });
  const text = await res.text();
  return { status: res.status, text };
};

const run = async () => {
  const body = makeBody();
  console.log('Sending first replay...');
  const r1 = await send(body);
  console.log('First response:', r1.status, r1.text);
  // Short delay before replay
  await new Promise((r) => setTimeout(r, 1000));
  console.log('Sending duplicate replay...');
  const r2 = await send(body);
  console.log('Second response:', r2.status, r2.text);
};

run().catch((err) => {
  console.error('Error during replay:', err);
  process.exit(1);
});
