// Front-door gate + Didit webhook signature (safe — pure logic, no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { onboardingStep, STEP_ROUTE } from '../utils/onboarding-schema.ts';
import { canonicalJson, verifyDiditWebhook } from '../utils/didit-webhook.ts';

const SECRET = 'test_destination_secret';
const NOW = 1760000000;

void test('the gate walks the funnel in order and stops at the first closed door', () => {
  assert.equal(
    onboardingStep({
      consentsComplete: false,
      verified: false,
      hasMembership: false
    }),
    'consent'
  );
  assert.equal(
    onboardingStep({
      consentsComplete: true,
      verified: false,
      hasMembership: false
    }),
    'verify'
  );
  assert.equal(
    onboardingStep({
      consentsComplete: true,
      verified: true,
      hasMembership: false
    }),
    'membership'
  );
  assert.equal(
    onboardingStep({
      consentsComplete: true,
      verified: true,
      hasMembership: true
    }),
    'club'
  );
  // consents first, always — a verified bot with no consent still stands outside
  assert.equal(
    onboardingStep({
      consentsComplete: false,
      verified: true,
      hasMembership: true
    }),
    'consent'
  );
});

void test('routes exist for every waiting step and none for the club', () => {
  assert.equal(Object.keys(STEP_ROUTE).length, 3);
  assert.ok(STEP_ROUTE.membership.includes('square.site'));
});

void test('canonicalJson sorts keys recursively, compacts, preserves Unicode', () => {
  const out = canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 'é', e: 5 }] } });
  assert.equal(out, '{"a":{"c":[3,{"e":5,"f":"é"}],"d":2},"b":1}');
});

void test('v2 signature round-trips and tampering fails', () => {
  const body = {
    event_id: 'e1',
    session_id: 's1',
    status: 'Approved',
    webhook_type: 'status.updated'
  };
  const raw = JSON.stringify(body);
  const sig = createHmac('sha256', SECRET)
    .update(canonicalJson(body), 'utf8')
    .digest('hex');
  const ok = verifyDiditWebhook(
    raw,
    { signatureV2: sig, timestamp: String(NOW) },
    SECRET,
    NOW
  );
  assert.equal(ok.ok, true);
  const tampered = verifyDiditWebhook(
    JSON.stringify({ ...body, status: 'Declined' }),
    { signatureV2: sig, timestamp: String(NOW) },
    SECRET,
    NOW
  );
  assert.equal(tampered.ok, false);
});

void test('raw signature verifies exact bytes; wrong secret rejected', () => {
  const raw = '{"status":"Approved","zz":1}';
  const sig = createHmac('sha256', SECRET).update(raw, 'utf8').digest('hex');
  assert.equal(
    verifyDiditWebhook(
      raw,
      { signature: sig, timestamp: String(NOW) },
      SECRET,
      NOW
    ).ok,
    true
  );
  assert.equal(
    verifyDiditWebhook(
      raw,
      { signature: sig, timestamp: String(NOW) },
      'other',
      NOW
    ).ok,
    false
  );
});

void test('stale timestamps and missing signatures never pass', () => {
  const body = '{}';
  const sig = createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');
  assert.equal(
    verifyDiditWebhook(
      body,
      { signature: sig, timestamp: String(NOW - 301) },
      SECRET,
      NOW
    ).ok,
    false
  );
  assert.equal(verifyDiditWebhook(body, {}, SECRET, NOW).ok, false);
  // the deprecated envelope-only mode must be refused, not trusted
  assert.equal(
    verifyDiditWebhook(
      body,
      { signature: sig, timestamp: 'not-a-number' },
      SECRET,
      NOW
    ).ok,
    false
  );
});
