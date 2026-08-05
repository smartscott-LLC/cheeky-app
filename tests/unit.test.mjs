// The one "pure logic" rule worth pinning: how many tokens a product name
// grants. The webhook credit path (utils/supabase/admin.ts) uses the same
// function, so a bad product name can never silently credit the wrong amount.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTokenAmount } from '../utils/token-amount.ts';

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
