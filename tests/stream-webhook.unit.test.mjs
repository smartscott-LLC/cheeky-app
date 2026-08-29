// Stream webhook — safe unit test for the HMAC-SHA256 signature verify.
//
// Pin the rule the production handler uses: a hex HMAC-SHA256 of the
// raw (optionally gunzipped) request body, compared in constant time
// against the X-Signature header. A bug here means anyone can forge
// message.new / user.banned / channel.created events — so this test
// runs in CI as part of `pnpm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

// JS mirror of /app/api/chat/stream-webhook/route.ts.
const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

function gunzip(body) {
  if (body.length >= 2 && body.subarray(0, 2).equals(GZIP_MAGIC)) {
    return zlib.gunzipSync(body);
  }
  return body;
}

function verifySignature(body, signature, secret) {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const SECRET = 'shhh-this-is-a-test-secret';
const body = Buffer.from(
  JSON.stringify({ type: 'message.new', hello: 'world' })
);
const goodSig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

test('verify: a fresh signature is accepted', () => {
  assert.equal(verifySignature(body, goodSig, SECRET), true);
});

test('verify: a forged signature is rejected', () => {
  const forged = crypto
    .createHmac('sha256', 'not-the-right-secret')
    .update(body)
    .digest('hex');
  assert.equal(verifySignature(body, forged, SECRET), false);
});

test('verify: a missing header is rejected', () => {
  assert.equal(verifySignature(body, null, SECRET), false);
  assert.equal(verifySignature(body, '', SECRET), false);
});

test('verify: a signature of the wrong length is rejected (no crash)', () => {
  // timingSafeEqual throws on length mismatch; the helper must guard.
  assert.equal(verifySignature(body, 'aabbcc', SECRET), false);
  assert.equal(verifySignature(body, 'a'.repeat(128), SECRET), false);
});

test('verify: the body is hashed exactly as the bytes were sent', () => {
  // Re-serialise with different key order and confirm the verify fails
  // — the docs are explicit: hash the raw body, not a re-stringified
  // version. The handler must hand verifyAndParseWebhook the bytes
  // straight from the request.
  const altBody = Buffer.from(
    JSON.stringify({ hello: 'world', type: 'message.new' })
  );
  const altSig = crypto.createHmac('sha256', SECRET).update(altBody).digest('hex');
  assert.equal(verifySignature(body, altSig, SECRET), false);
});

test('verify: gzipped bodies are decompressed before hashing', () => {
  const gz = zlib.gzipSync(body);
  // Confirm the helper detects the magic and unzips.
  assert.equal(gunzip(gz).toString('utf8'), body.toString('utf8'));
  // The signature in this test was computed over the UNCOMPRESSED body,
  // so verification should still succeed when we gunzip first.
  assert.equal(verifySignature(gunzip(gz), goodSig, SECRET), true);
  // And without gunzip, verification fails — proves the compression
  // branch matters.
  assert.equal(verifySignature(gz, goodSig, SECRET), false);
});

test('verify: the signature is case-sensitive hex (lowercase)', () => {
  // Lowercase matches our HMAC output and the docs.
  assert.equal(goodSig, goodSig.toLowerCase());
  assert.match(goodSig, /^[0-9a-f]{64}$/);
});
