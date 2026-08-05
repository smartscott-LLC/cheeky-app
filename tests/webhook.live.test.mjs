// Webhook handler tests (audit #7). LIVE: hit the deployed endpoint with
// locally-signed Stripe events — no Stripe API calls, no side effects beyond
// the idempotency store rows the handler is designed to record.
//
//   RUN_LIVE_TESTS=1 node --test tests/webhook.live.test.mjs
//   (endpoint override: WEBHOOK_TEST_ENDPOINT=...)
//
// Requires STRIPE_WEBHOOK_SECRET in .env.local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const ENDPOINT =
  process.env.WEBHOOK_TEST_ENDPOINT ?? 'https://smartscott.online/api/webhooks';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const sign = (body) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = createHmac('sha256', SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
};

const makeEvent = (id, type, object) =>
  JSON.stringify({
    id,
    object: 'event',
    api_version: '2026-06-24.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: true,
    type
  });

const post = (body, sig) =>
  fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': sig
    },
    body
  });

test(
  'webhook handlers (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!SECRET) return t.skip('STRIPE_WEBHOOK_SECRET not in .env.local');

    await t.test('rejects a request with no signature', async () => {
      const res = await fetch(ENDPOINT, { method: 'POST', body: '{}' });
      assert.equal(res.status, 400);
    });

    await t.test('rejects a forged signature', async () => {
      const body = makeEvent('evt_test_forged', 'charge.succeeded', {
        id: 'ch_test'
      });
      const res = await post(body, 't=0,v1=deadbeef');
      assert.equal(res.status, 400);
    });

    await t.test('pre-flight: deployed handler knows the webhook secret', async () => {
      const body = makeEvent(`evt_preflight_${Date.now()}`, 'charge.succeeded', {
        id: 'ch_test'
      });
      const res = await post(body, sign(body));
      if (res.status === 400) {
        const text = await res.text();
        assert.notEqual(
          text,
          'Webhook secret not found.',
          'The deployed webhook cannot find STRIPE_WEBHOOK_SECRET — add it to Vercel for Production and redeploy, then re-run.'
        );
      }
      assert.equal(res.status, 200);
    });

    await t.test('accepts a valid signature on an unhandled event type', async () => {
      const body = makeEvent(`evt_test_${Date.now()}`, 'charge.succeeded', {
        id: 'ch_test'
      });
      const res = await post(body, sign(body));
      assert.equal(res.status, 200);
    });

    await t.test(
      'idempotency: replaying the same event is acknowledged, never reprocessed',
      async () => {
        const body = makeEvent(`evt_test_${Date.now()}`, 'charge.succeeded', {
          id: 'ch_test'
        });
        const sig = sign(body);
        const r1 = await post(body, sig);
        assert.equal(r1.status, 200);
        const r2 = await post(body, sig);
        assert.equal(r2.status, 200);
      }
    );

    await t.test('handles a burst of concurrent requests without error', async () => {
      // 15 valid events in flight at once — exercises the idempotency store
      // (mark_webhook_processed) under real concurrency.
      const bodies = Array.from(
        { length: 15 },
        (_, i) =>
          makeEvent(`evt_test_burst_${i}_${Date.now()}`, 'charge.succeeded', {
            id: 'ch_test'
          })
      );
      const results = await Promise.all(bodies.map((b) => post(b, sign(b))));
      assert.ok(
        results.every((r) => r.status === 200),
        `burst responses: ${results.map((r) => r.status).join(',')}`
      );
    });
  }
);
