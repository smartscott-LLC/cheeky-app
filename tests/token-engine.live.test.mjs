// Token engine tests (audit #7). LIVE: exercises the real RPCs against the
// hosted DB with throwaway members, then cleans every row it touched.
//   - redeem_swag_code: exact credits, no double redemption
//   - join_event: N members joining one event concurrently (the "thousand
//     people at once" case) all land with consistent holds
//   - no over-commit: a member with 3 tokens cannot hold two 3-token events
//
//   RUN_LIVE_TESTS=1 STRESS_N=1000 node --test tests/token-engine.live.test.mjs
//
// The burst fires through the production connection path — the pgbouncer
// pooler, one transaction per member with per-transaction identity — so
// every call exercises the real RPC + row locks under a true N-way burst.
// Requires Supabase env + POSTGRES_URL (pooler) in .env.local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

config({ path: '.env.local' });

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const POOL_URL = process.env.POSTGRES_URL; // pgbouncer pooler, like production
const N = parseInt(process.env.STRESS_N ?? '20', 10);

// Call an RPC as the given member through the real REST gateway.
async function rpc(token, fn, args) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  if (res.status >= 400) {
    const text = await res.text().catch(() => '');
    return { error: { message: text.slice(0, 300) || `HTTP ${res.status}` } };
  }
  return { data: await res.json().catch(() => null) };
}

async function makeUser(admin, anon, stamp, tag, { signIn = true } = {}) {
  const email = `toktest-${tag}-${stamp}@clubcheeky.test`;
  const password = `${randomBytes(9).toString('base64url')}!A7`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const u = { id: data.user.id, email, token: null };
  if (signIn) {
    const { data: s, error: sErr } = await anon.auth.signInWithPassword({
      email,
      password
    });
    if (sErr) throw new Error(`signIn: ${sErr.message}`);
    u.token = s.session.access_token;
  }
  return u;
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
    if (!URL || !SERVICE_KEY || !ANON_KEY)
      return t.skip('Supabase env missing');

    const admin = createClient(URL, SERVICE_KEY);
    const anon = createClient(URL, ANON_KEY);
    const stamp = Date.now();
    const userIds = [];
    const events = [];
    const codes = [];

    t.after(async () => {
      // Bulk-delete everything this run touched, children before parents.
      const chunkIn = async (table, col, ids) => {
        for (let i = 0; i < ids.length; i += 100) {
          await admin.from(table).delete().in(col, ids.slice(i, i + 100));
        }
      };
      if (events.length)
        await chunkIn('event_entries', 'event_id', events);
      if (userIds.length) {
        for (const t of ['token_ledger', 'benefit_grants', 'gift_inventory']) {
          await chunkIn(t, 'user_id', userIds);
        }
        // deleteUser is per-user; parallelize in chunks.
        const chunk = 25;
        for (let i = 0; i < userIds.length; i += chunk) {
          await Promise.all(
            userIds.slice(i, i + chunk).map((id) =>
              admin.auth.admin.deleteUser(id).catch(() => {})
            )
          );
        }
      }
      for (const e of events) await admin.from('events').delete().eq('id', e);
      for (const c of codes) await admin.from('swag_codes').delete().eq('code', c);
    });

    await t.test('redeem_swag_code credits the exact amount, once', async () => {
      const u = await makeUser(admin, anon, stamp, 'redeem');
      userIds.push(u.id);
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

      const { data: redeemed, error: rErr } = await rpc(u.token, 'redeem_swag_code', {
        p_code: code
      });
      assert.ok(!rErr, rErr?.message);
      assert.equal(redeemed[0].benefit_type, 'tokens');
      assert.equal(redeemed[0].benefit_value, '25');
      assert.equal(await balance(admin, u.id), 35, '10 + 25');

      const { error: r2Err } = await rpc(u.token, 'redeem_swag_code', {
        p_code: code
      });
      assert.ok(r2Err, 'second redeem must fail');
    });

    await t.test(
      `${N} members join one event concurrently — all land, holds consistent`,
      async () => {
        if (!POOL_URL) return t.skip('POSTGRES_URL (pooler) missing');
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
        const CHUNK = 25;
        for (let i = 0; i < N; i += CHUNK) {
          const batch = await Promise.all(
            Array.from({ length: Math.min(CHUNK, N - i) }, (_, k) =>
              makeUser(admin, anon, stamp, `join${i + k}`, { signIn: false })
            )
          );
          for (const u of batch) {
            userIds.push(u.id);
            await credit(admin, u.id, 10);
            members.push(u);
          }
        }

        // Fire the burst through the production connection path: the pgbouncer
        // pooler, one transaction per member, each with its own identity
        // (request.jwt.claims) so join_event sees a real authenticated user.
        const pool = postgres(POOL_URL, {
          max: 100,
          ssl: 'require',
          prepare: false, // pgBouncer transaction mode + named prepared statements don't mix
          connection_timeout: 10
        });
        const t0 = Date.now();
        const results = await Promise.allSettled(
          members.map((u) =>
            pool.begin(async (q) => {
              await q`select set_config('request.jwt.claims', ${JSON.stringify({
                sub: u.id,
                role: 'authenticated'
              })}, true)`;
              return q`select public.join_event(${ev.id}) as entry_id`;
            })
          )
        );
        const wallMs = Date.now() - t0;
        await pool.end();

        const ok = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');
        assert.equal(
          ok.length,
          N,
          `${ok.length}/${N} joins landed (${failed.length} failed: ${
            failed[0]?.reason?.message ?? '?'
          })`
        );

        const { data: entries } = await admin
          .from('event_entries')
          .select('user_id, status')
          .eq('event_id', ev.id);
        assert.equal(entries.length, N, 'exactly N entries');
        assert.ok(
          entries.every((e) => e.status === 'reserved'),
          'every entry reserved'
        );

        console.log(
          `  burst: ${N} concurrent joins in ${wallMs}ms (${Math.round(N / (wallMs / 1000))} joins/sec) — all ${N} landed`
        );

        // Holds are reservations, not debits — balances untouched.
        for (const u of members) {
          assert.equal(await balance(admin, u.id), 10);
        }
      }
    );

    await t.test(
      'no over-commit: 3 tokens cannot hold two 3-token events',
      async () => {
        const u = await makeUser(admin, anon, stamp, 'overcommit');
        userIds.push(u.id);
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
          rpc(u.token, 'join_event', { p_event_id: e1 }),
          rpc(u.token, 'join_event', { p_event_id: e2 })
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
