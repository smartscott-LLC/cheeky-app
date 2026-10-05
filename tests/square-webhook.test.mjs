// Square webhook geometry (safe — pure logic, no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  SQUARE_ITEMS,
  grantForItem,
  verifySquareSignature
} from '../utils/square-webhook.ts';

const KEY = 'test_signature_key';
const URL = 'https://www.smartscott.online/api/webhooks/square';
const NOW = Math.floor(Date.now() / 1000);

const sign = (ts) =>
  createHmac('sha256', KEY)
    .update(URL + ts, 'utf8')
    .digest('base64');

void test('signature round-trips; tampering and staleness fail', () => {
  const ts = String(NOW);
  assert.equal(verifySquareSignature(URL, ts, sign(ts), KEY), true);
  assert.equal(verifySquareSignature(URL, ts, sign(ts), 'wrong'), false);
  assert.equal(
    verifySquareSignature(URL.replace('square', 'sqre'), ts, sign(ts), KEY),
    false,
    'URL is part of the signed material'
  );
  assert.equal(
    verifySquareSignature(URL, String(NOW - 301), sign(String(NOW - 301)), KEY),
    false
  );
  assert.equal(verifySquareSignature(URL, ts, 'garbage!!', KEY), false);
});

void test('the item contract covers the whole store, exactly once', () => {
  const items = Object.values(SQUARE_ITEMS);
  assert.equal(items.length, 11, 'ITEM_LIBRARY.csv rows');
  assert.equal(new Set(items.map((i) => i.sku)).size, 11, 'SKUs unique');
  const skus = [
    'EN55HDVVDMNO7LSJ4S4SFWXQ',
    'XOJRF2KX2G3G7VAITEHPOO7Z',
    'EIYSBU27YOCGCWVMM3YIDO7X'
  ];
  assert.deepEqual(
    skus.map((s) => SQUARE_ITEMS[s].tier),
    ['gold', 'platinum', 'diamond']
  );
});

void test('memberships carry floors + 30 days + full token grants', () => {
  const gold = grantForItem('30-Day Gold Membership');
  assert.equal(gold.kind, 'membership');
  assert.equal(gold.tier, 'gold');
  assert.equal(gold.days, 30);
  assert.equal(gold.tokens, 50);
});

void test('trials pro-rate: 7 days, reduced tokens', () => {
  assert.equal(grantForItem('7-Day Gold Membership').tokens, 30);
  assert.equal(grantForItem('7-Day Platinum Membership').tokens, 90);
  assert.equal(grantForItem('7-Day Diamond Membership').tokens, 300);
  assert.equal(grantForItem('7-Day Diamond Membership').days, 7);
});

void test('silver is the ground: recorded, no expiry, no entitlement tier', () => {
  const silver = grantForItem('Ongoing Silver Membership');
  assert.equal(silver.tier, 'silver');
  assert.equal(silver.days, null);
  assert.equal(silver.amountCents, 0);
});

void test('token bundles + gift sets resolve; unknown items return null', () => {
  assert.equal(grantForItem('100 Tokens').kind, 'tokens');
  assert.equal(grantForItem('1000 Tokens').amountCents, 998);
  assert.equal(grantForItem('Gift Basket').kind, 'gift_set');
  assert.equal(grantForItem('Nope Membership'), null);
  assert.equal(grantForItem('YRON3YOV3X2H42H7WRFWIXVO').name, 'Horn Bundle');
});
