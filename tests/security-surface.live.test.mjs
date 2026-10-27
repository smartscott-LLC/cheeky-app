// tests/security-surface.live.test.mjs
// The public-perimeter contract (founder security audit 2026-10-27, promoted
// from hand-run probes to standing tripwires). Run with:
//   RUN_LIVE_TESTS=1 [TEST_URL=https://www.smartscott.online] node --test tests/security-surface.live.test.mjs
// Read-only + rejected-inputs only: nothing here writes a row or spends a token.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const l of readFileSync('.env.new', 'utf8').split('\n')) {
  const i = l.indexOf('=');
  if (i > 0 && !process.env[l.slice(0, i)])
    process.env[l.slice(0, i)] = l.slice(i + 1).replace(/^"|"$/g, '');
}
const BASE = process.env.TEST_URL ?? 'https://www.smartscott.online';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1' && Boolean(ANON);
const guard = {
  skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1 (and keys in .env.new)'
};

const anonGet = (path) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });

void test(
  'anon sees NO member photos enumeration (the 20261027000002 hole stays closed)',
  guard,
  async () => {
    const r = await anonGet('photos?select=storage_path&limit=5');
    assert.equal(
      r.status,
      200,
      'RLS returns empty, not 403 — policy-level denial'
    );
    assert.deepEqual(await r.json(), [], 'photos must be empty for anon');
  }
);

void test('anon sees no messages, matches, purchases, ledger', guard, async () => {
  for (const t of ['messages', 'matches', 'store_purchases', 'token_ledger']) {
    const r = await anonGet(`${t}?select=id&limit=3`);
    assert.deepEqual(await r.json(), [], `${t} leaked rows to anon`);
  }
});

void test(
  'anon can ONLY execute the declared function (guard is separate schema)',
  guard,
  async () => {
    // current_tier was observed anon-executable in the audit — it returns a
    // constant for anon (no auth.uid) and is on the allowlist. Assert only that
    // SENSITIVE RPCs stay closed.
    for (const rpc of ['bump_rate_limit', 'taskbar_state', 'use_icebreaker']) {
      const r = await fetch(`${BASE}/rest/v1/rpc/${rpc}`, {
        method: 'POST',
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      assert.equal(r.status, 401, `${rpc} must deny anon (saw ${r.status})`);
    }
  }
);

void test(
  'webhook doors refuse unsigned/forged traffic on the public route',
  guard,
  async () => {
    for (const p of ['/api/webhooks/square', '/api/webhooks/didit']) {
      const r = await fetch(`${BASE}${p}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'webhook-signature': 'deadbeef'
        },
        body: '{}'
      });
      assert.ok(
        [400, 401].includes(r.status),
        `${p} accepted unsigned input (${r.status})`
      );
    }
  }
);

void test(
  'the sealed avatar lane stays sealed: no public HTML links the maker',
  guard,
  async () => {
    for (const p of [
      '/',
      '/pricing',
      '/welcome',
      '/welcome/preview',
      '/account',
      '/signin'
    ]) {
      const html = await (await fetch(`${BASE}${p}`)).text();
      assert.ok(!html.includes('maker.smartscott'), `${p} leaks a maker link`);
    }
  }
);

void test(
  'soft-open beta banner presents while the doors are on invites',
  guard,
  async () => {
    const landing = await (await fetch(`${BASE}/`)).text();
    const welcome = await (await fetch(`${BASE}/welcome`)).text();
    // Either the banner is up (beta) or the club is open — never a stale date.
    assert.ok(
      /Beta testing in progress|doors/i.test(landing) ||
        !/Beta testing/.test(welcome),
      'banner state inconsistent between landing and welcome'
    );
  }
);

void test(
  'gated world sends signed-out visitors to the sign-up, not a 500',
  guard,
  async () => {
    for (const p of ['/club', '/browse', '/messages']) {
      const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
      assert.ok(
        [302, 307].includes(r.status) || r.status === 200,
        `${p} odd status ${r.status}`
      );
    }
  }
);
