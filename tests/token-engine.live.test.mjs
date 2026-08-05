// Token engine tests (audit #7). LIVE: exercises the real RPCs against the
// hosted DB with throwaway members, then cleans every row it touched.
//   - redeem_swag_code: exact credits, no double redemption
//   - join_event: N members joining one event concurrently (the "thousand
//     people at once" case) all land with consistent holds
//   - no over-commit: a member with 3 tokens cannot hold two 3-token events
//
//   RUN_LIVE_TESTS=1 STRESS_N=50 node --test tests/token-engine.live.test.mjs
//
// Requires Supabase env (URL + service role + anon) in .env.local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const N = parseInt(process.env.STRESS_N ?? '20', 10);

async function makeUser(admin, stamp, tag) {
  const email = `toktest-${tag}-${stamp}@clubcheeky.test`;
  const password = `${randomBytes(9).toString('base64url')}!A7`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const anon = createClient(URL, ANON_KEY);
  const { data: s, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password
  });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  return { id: data.user.id, email, client: anon };
}

async function credit(admin, userId, delta) {
  const { error } = await admin
    .from('token_ledger')
    .insert({ user_id: userId, delta, reason: 'test_seed' });
  if (error) throw new Error(`credit: ${error.message}`);
}

async function balance(admin, userId) {
  const { data } = await admin
    .from('token_ledger')
    .select('delta')
    .eq('user_id', userId);
  return (data ?? []).reduce((s, r) => s + r.delta, 0);
}

test(
  'token engine (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!URL || !SERVICE_KEY || !ANON_KEY) return t.skip('Supabase env missing');

    const admin = createClient(URL, SERVICE_KEY);
    const stamp = Date.now();
    const users = [];
    const events = [];
    const codes = [];

    t.after(async () => {
      // Clean everything this run touched, children before parents.
      for (const u of users) {
        await admin.from('token_ledger').delete().eq('user_id', u.id);
        await admin.from('benefit_grants').delete().eq('user_id', u.id);
        await admin.from('gift_inventory').delete().eq('user_id', u.id);
        await admin.from('event_entries').delete().eq('user_id', u.id);
        await admin.auth.admin.deleteUser(u.id);
      }
      for (const e of events) await admin.from('events').delete().eq('id', e);
      for (const c of codes) await admin.from('swag_codes').delete().eq('code', c);
    });

    await t.test('redeem_swag_code credits the exact amount, once', async () => {
      const u = await makeUser(admin, stamp, 'redeem');
      users.push(u.id);
      await credit(admin, u.id, 10);

      const { data: code, error: mintErr } = await admin.rpc(
        'generate_swag_code',
        {
          p_benefit_type: 'tokens',
          p_benefit_value: '25',
          p_actor_type: 'owner',
          p_max_uses: 1,
          p_notes: `test:${stamp}`
        }
      );
      assert.ok(!mintErr, mintErr?.message);
      codes.push(code);

      const { data: redeemed, error: rErr } = await u.client.rpc(
        'redeem_swag_code',
        { p_code: code }
      );
      assert.ok(!rErr, rErr?.message);
      assert.equal(redeemed[0].benefit_type, 'tokens');
      assert.equal(redeemed[0].benefit_value, '25');
      assert.equal(await balance(admin, u.id), 35, '10 + 25');

      // A code can never be redeemed twice by the same member.
      const { error: r2Err } = await u.client.rpc('redeem_swag_code', {
        p_code: code
      });
      assert.ok(r2Err, 'second redeem must fail');
    });

    await t.test(
      `${N} members join one event concurrently — all land, holds consistent`,
      async () => {
        const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const { data: ev, error: evErr } = await admin
          .from('events')
          .insert({
            kind: `dance_floor_${stamp}`,
            floor: 'silver',
            starts_at: startsAt,
            status: 'open',
            token_cost: 3
          })
          .select('id')
          .single();
        assert.ok(!evErr, evErr?.message);
        events.push(ev.id);

        const members = [];
        for (let i = 0; i < N; i++) {
          const u = await makeUser(admin, stamp, `join${i}`);
          users.push(u.id);
          await credit(admin, u.id, 10);
          members.push(u);
        }

        const results = await Promise.allSettled(
          members.map((u) =>
            u.client.rpc('join_event', { p_event_id: ev.id })
          )
        );
        const ok = results.filter(
          (r) => r.status === 'fulfilled' && !r.value.error
        );
        assert.equal(ok.length, N, `${ok.length}/${N} joins landed`);

        const { data: entries } = await admin
          .from('event_entries')
          .select('user_id, status')
          .eq('event_id', ev.id);
        assert.equal(entries.length, N, 'exactly N entries');
        assert.ok(
          entries.every((e) => e.status === 'reserved'),
          'every entry reserved'
        );

        // Holds are reservations, not debits — balances must be untouched.
        for (const u of members) {
          assert.equal(await balance(admin, u.id), 10);
        }
      }
    );

    await t.test(
      'no over-commit: 3 tokens cannot hold two 3-token events',
      async () => {
        const u = await makeUser(admin, stamp, 'overcommit');
        users.push(u.id);
        await credit(admin, u.id, 3); // exactly one event's worth

        const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        const mk = async (kind) => {
          const { data, error } = await admin
            .from('events')
            .insert({
              kind: `${kind}_${stamp}`,
              floor: 'silver',
              starts_at: startsAt,
              status: 'open',
              token_cost: 3
            })
            .select('id')
            .single();
          assert.ok(!error, error?.message);
          events.push(data.id);
          return data.id;
        };
        const e1 = await mk('dance_floor');
        const e2 = await mk('themed_night');

        const results = await Promise.allSettled([
          u.client.rpc('join_event', { p_event_id: e1 }),
          u.client.rpc('join_event', { p_event_id: e2 })
        ]);
        const ok = results.filter(
          (r) => r.status === 'fulfilled' && !r.value.error
        );
        assert.equal(
          ok.length,
          1,
          `expected exactly 1 join to succeed, got ${ok.length}`
        );
      }
    );
  }
);
