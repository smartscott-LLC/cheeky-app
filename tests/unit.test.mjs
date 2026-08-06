// The one "pure logic" rule worth pinning: how many tokens a product name
// grants. The webhook credit path (utils/supabase/admin.ts) uses the same
// function, so a bad product name can never silently credit the wrong amount.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTokenAmount } from '../utils/token-amount.ts';
import {
  membershipTokenGrant,
  membershipGrantRef
} from '../utils/membership-tokens.ts';

test('parseTokenAmount extracts the token count from product names', () => {
  // The real product names in the Stripe catalog.
  assert.equal(parseTokenAmount('Cheeky Token Bag - 100 Tokens'), 100);
  assert.equal(parseTokenAmount('Token Bundle 1000 Tokens'), 1000);
  // Singular + case-insensitive forms.
  assert.equal(parseTokenAmount('10 Token'), 10);
  assert.equal(parseTokenAmount('tokens 25 tokens'), 25);
  // Not a token product — must NOT credit.
  assert.equal(parseTokenAmount('Diamond Membership'), null);
  assert.equal(parseTokenAmount(''), null);
  assert.equal(parseTokenAmount(null), null);
});

test('membership token grants: every paid tier, every cycle', () => {
  // The real membership product names in the Stripe catalog.
  assert.equal(membershipTokenGrant('Gold Membership').amount, 100);
  assert.equal(membershipTokenGrant('Platinum Membership').amount, 200);
  assert.equal(membershipTokenGrant('Diamond Membership').amount, 500);
  assert.equal(membershipTokenGrant('Gold Membership').reason, 'membership_gold');
  assert.equal(
    membershipTokenGrant('Platinum Membership').reason,
    'membership_platinum'
  );
  assert.equal(
    membershipTokenGrant('Diamond Membership').reason,
    'membership_diamond'
  );
  // Not a membership — must NOT grant.
  assert.equal(membershipTokenGrant('Cheeky Token Bag - 100 Tokens'), null);
  assert.equal(membershipTokenGrant('Standard Membership'), null);
  assert.equal(membershipTokenGrant(''), null);
  assert.equal(membershipTokenGrant(null), null);
  // The ref keys one grant per subscription + period + tier (so a mid-cycle
  // upgrade lands a fresh grant; a renewal advances the period).
  const a = membershipGrantRef('sub_1', '2026-08-06T00:00:00Z', 'price_g');
  const b = membershipGrantRef('sub_1', '2026-09-06T00:00:00Z', 'price_g');
  const c = membershipGrantRef('sub_1', '2026-08-06T00:00:00Z', 'price_p');
  assert.notEqual(a, b, 'renewal = new period = new ref');
  assert.notEqual(a, c, 'upgrade = new tier = new ref');
  assert.equal(a, membershipGrantRef('sub_1', '2026-08-06T00:00:00Z', 'price_g'));
});
