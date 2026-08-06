// Event-kind tests (the core hourly wheel, audit #7 follow-up). LIVE:
// exercises the mechanics the token-engine suite doesn't touch — every event
// kind on the stagger, the Date Night game, and finalize_events (the minute
// hand) under load. Throwaway members, full cleanup.
//
//   RUN_LIVE_TESTS=1 STRESS_N=120 node --test tests/events.live.test.mjs
//
// Requires Supabase env + POSTGRES_URL (pooler) in env.new.
//
// Two subtests assert PRD-intended settlement (speed dating "pay for the
// opportunity", Date Night mutual lock) — the rework migrations make them
// green; red before that, exactly like the audit suite that caught live bugs
// (ceb1d83).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

config({ path: 'env.new' });

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const POOL_URL = process.env.POSTGRES_URL; // pgbouncer pooler, like production
const N = parseInt(process.env.STRESS_N ?? '120', 10);

async function makeUser(admin, stamp, tag) {
  const email = `evttest-${tag}-${stamp}@clubcheeky.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `${randomBytes(9).toString('base64url')}!A7`,
    email_confirm: true
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  return { id: data.user.id, email };
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

// Run an RPC as the given member through the production connection path
// (pgBouncer pooler, per-transaction identity via request.jwt.claims).
function makeRpc(pool) {
  return async (userId, query, args) => {
    const result = await pool.begin(async (q) => {
      await q`select set_config('request.jwt.claims', ${JSON.stringify({
        sub: userId,
        role: 'authenticated'
      })}, true)`;
      return q.unsafe(query, args ?? []);
    });
    return result;
  };
}

test(
  'event kinds (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!URL || !SERVICE_KEY || !POOL_URL)
      return t.skip('Supabase env (or pooler) missing');

    const admin = createClient(URL, SERVICE_KEY);
    const stamp = Date.now();
    const userIds = [];
    const events = [];
    const pool = postgres(POOL_URL, {
      max: 50,
      ssl: 'require',
      prepare: false,
      connection_timeout: 10
    });
    const rpcAs = makeRpc(pool);

    const cleanup = async () => {
      for (const e of events) {
        await admin.from('event_entries').delete().eq('event_id', e);
        await admin.from('matches').delete().or(
          `user_id_a.in.(${userIds.join(',')}),user_id_b.in.(${userIds.join(',')})`
        );
      }
      for (let i = 0; i < userIds.length; i += 100) {
        const ids = userIds.slice(i, i + 100);
        await admin.from('token_ledger').delete().in('user_id', ids);
        await admin.from('event_entries').delete().in('user_id', ids);
        await admin.from('certificates').delete().in('user_id', ids);
        await admin.from('date_night_picks').delete().in('user_id', ids);
      }
      const chunk = 25;
      for (let i = 0; i < userIds.length; i += chunk) {
        await Promise.all(
          userIds.slice(i, i + chunk).map((id) =>
            admin.auth.admin.deleteUser(id).catch(() => {})
          )
        );
      }
      for (const e of events) await admin.from('events').delete().eq('id', e);
    };

    t.after(async () => {
      await cleanup();
      await pool.end().catch(() => {});
    });

    await t.test('the hourly wheel: all four kinds, on the quarter, live', async () => {
      const { data: all } = await admin
        .from('events')
        .select('kind, floor, starts_at');
      const minutesOf = (k) =>
        new Set(
          (all ?? [])
            .filter((e) => e.kind === k)
            .map((e) => new Date(e.starts_at).getUTCMinutes())
        );
      assert.ok(minutesOf('dance_floor').has(0), 'dance_floor runs at :00');
      assert.ok(minutesOf('themed_night').has(15), 'themed_night at :15');
      assert.ok(minutesOf('speed_dating').has(30), 'speed_dating at :30');
      assert.ok(minutesOf('rooftop').has(45), 'rooftop at :45');
      const floors = Object.fromEntries((all ?? []).map((e) => [e.kind, e.floor]));
      assert.equal(floors.dance_floor, 'silver');
      assert.equal(floors.speed_dating, 'platinum');
      assert.equal(floors.rooftop, 'diamond');
      // The scheduler is alive: each kind's newest slot is recent (the cron
      // pre-creates the next hours at :05, so the newest is usually future —
      // if it ever stops, the newest slot ages past this window and fails).
      const now = Date.now();
      for (const k of ['dance_floor', 'themed_night', 'speed_dating', 'rooftop']) {
        const newest = Math.max(
          ...(all ?? [])
            .filter((e) => e.kind === k)
            .map((e) => new Date(e.starts_at).getTime())
        );
        assert.ok(
          now - newest < 100 * 60 * 1000,
          `${k} scheduler alive (newest slot within 100min)`
        );
      }
    });

    const mkEvent = async (kind, floor, cost, minsFromNow) => {
      const { data, error } = await admin
        .from('events')
        .insert({
          kind,
          floor,
          starts_at: new Date(Date.now() + minsFromNow * 60 * 1000).toISOString(),
          status: 'open',
          token_cost: cost,
          min_fill: 2
        })
        .select('id')
        .single();
      assert.ok(!error, error?.message);
      events.push(data.id);
      return data.id;
    };

    // finalize_events flips a filled, on-time event to 'running' — the grid
    // tests simulate that hand (the round must be live to pick).
    const startRound = async (ev) => {
      const { error } = await admin
        .from('events')
        .update({ status: 'running' })
        .eq('id', ev);
      assert.ok(!error, `round start: ${error?.message}`);
    };

    for (const [kind, floor, cost] of [
      ['dance_floor', 'silver', 3],
      ['themed_night', 'gold', 5],
      ['rooftop', 'diamond', 40]
    ]) {
      await t.test(`${kind}: mutual pick -> match, holds -> debits`, async () => {
        const ev = await mkEvent(`${kind}_${stamp}`, floor, cost, 60);
        const a = await makeUser(admin, stamp, `${kind}a`);
        const b = await makeUser(admin, stamp, `${kind}b`);
        userIds.push(a.id, b.id);
        await credit(admin, a.id, cost + 5);
        await credit(admin, b.id, cost + 5);

        const joinA = await rpcAs(a.id, `select public.join_event('${ev}')`, []);
        assert.ok(!joinA?.[0]?.error, 'A joined');
        await rpcAs(b.id, `select public.join_event('${ev}')`, []);
        await startRound(ev);

        // A picks B — no match yet.
        const pickA = await rpcAs(
          a.id,
          `select * from public.pick_on_floor('${ev}', '${b.id}')`,
          []
        );
        assert.equal(pickA[0].matched, false);
        // B picks A — mutual → match.
        const pickB = await rpcAs(
          b.id,
          `select * from public.pick_on_floor('${ev}', '${a.id}')`,
          []
        );
        assert.equal(pickB[0].matched, true, 'mutual pick matches');

        const { data: match } = await admin
          .from('matches')
          .select('id')
          .or(`user_id_a.eq.${a.id},user_id_b.eq.${a.id}`)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        assert.ok(match, 'a match row exists');
        assert.equal(await balance(admin, a.id), cost + 5 - cost, 'A debited the cost');
        assert.equal(await balance(admin, b.id), cost + 5 - cost, 'B debited the cost');

        const { data: entries } = await admin
          .from('event_entries')
          .select('status')
          .eq('event_id', ev)
          .in('user_id', [a.id, b.id]);
        assert.ok(
          entries.every((e) => e.status === 'locked'),
          'both entries locked out of the round'
        );
      });
    }

    await t.test(
      'speed dating: full ranking, strongest mutuals match, everyone pays 25',
      async () => {
        const ev = await mkEvent(`speed_dating_${stamp}`, 'platinum', 25, 60);
        const u = [];
        for (let i = 0; i < 6; i++) {
          const m = await makeUser(admin, stamp, `sd${i}`);
          u.push(m);
          userIds.push(m.id);
          await credit(admin, m.id, 30);
          await rpcAs(m.id, `select public.join_event('${ev}')`, []);
        }
        // Six members, one group (group cap is 6). Full ranking: u0<->u1 and
        // u2<->u3 are rank-1 mutuals (strongest); u4<->u5 are rank-2 mutuals
        // and must still match after the stronger pairs are taken.
        await pool`select public.setup_speed_dating(${ev})`;

        await rpcAs(u[0].id, `select public.select_speed_rank('${ev}', 1::smallint, '${u[1].id}')`, []);
        await rpcAs(u[1].id, `select public.select_speed_rank('${ev}', 1::smallint, '${u[0].id}')`, []);
        await rpcAs(u[2].id, `select public.select_speed_rank('${ev}', 1::smallint, '${u[3].id}')`, []);
        await rpcAs(u[3].id, `select public.select_speed_rank('${ev}', 1::smallint, '${u[2].id}')`, []);
        await rpcAs(u[4].id, `select public.select_speed_rank('${ev}', 2::smallint, '${u[5].id}')`, []);
        await rpcAs(u[5].id, `select public.select_speed_rank('${ev}', 2::smallint, '${u[4].id}')`, []);

        await pool`select public.resolve_speed_dating(${ev})`;

        const { data: certs } = await admin
          .from('certificates')
          .select('user_id')
          .in('user_id', u.map((m) => m.id));
        assert.equal(certs.length, 6, 'all six matched members hold a certificate');

        // PRD: pay for the opportunity — EVERY participant pays the 25, match
        // or not. Holds convert to spend; entries lock out of the rotation.
        const { data: entries } = await admin
          .from('event_entries')
          .select('status, user_id')
          .eq('event_id', ev);
        const byUser = Object.fromEntries(
          (entries ?? []).map((e) => [e.user_id, e.status])
        );
        for (const m of u) {
          assert.equal(
            byUser[m.id],
            'locked',
            `member ${m.email} entry locked (hold spent)`
          );
          assert.equal(await balance(admin, m.id), 5, `${m.email} debited 25`);
        }
      }
    );

    await t.test('date night: matched pair, mutual taps lock the round', async () => {
      const a = await makeUser(admin, stamp, 'dna');
      const b = await makeUser(admin, stamp, 'dnb');
      userIds.push(a.id, b.id);
      const { error: mErr } = await admin.from('matches').insert({
        user_id_a: a.id < b.id ? a.id : b.id,
        user_id_b: a.id < b.id ? b.id : a.id,
        source: 'browse',
        status: 'active'
      });
      assert.ok(!mErr, mErr?.message);

      const started = await rpcAs(
        a.id,
        `select public.start_date_night('${b.id}') as gid`,
        []
      );
      const gid = started[0].gid;
      assert.ok(gid, 'game started');

      const stateOf = async (userId) => {
        const s = await rpcAs(
          userId,
          `select * from public.date_night_state('${gid}')`,
          []
        );
        return s[0].date_night_state.game;
      };

      // A taps — the question must still be live: the round locks only when
      // BOTH have acted. (Red until the mutual-lock fix lands.)
      await rpcAs(a.id, `select public.tap_date_night('${gid}', 0, 2::smallint)`, []);
      let g = await stateOf(a.id);
      assert.equal(g.current_index, 0, 'question waits for the partner');
      assert.equal(g.status, 'active', 'game still active');

      // B taps the same option — both acted, the round locks and advances.
      await rpcAs(b.id, `select public.tap_date_night('${gid}', 0, 2::smallint)`, []);
      g = await stateOf(a.id);
      assert.equal(g.current_index, 1, 'round advanced after both taps');
      assert.equal(g.results.length, 1, 'one round resolved');
    });

    await t.test(
      'blind date: host asks, suitors answer, most tallies wins, suitors pay 15',
      async () => {
        const host = await makeUser(admin, stamp, 'bdh');
        const suitors = [];
        for (let i = 0; i < 3; i++) {
          const s = await makeUser(admin, stamp, `bds${i}`);
          suitors.push(s);
          userIds.push(s.id);
          await credit(admin, s.id, 20);
        }
        userIds.push(host.id);

        // Gold gates the room (current_tier is the RPC-level check).
        const grant = {
          tier: 'gold',
          reason: 'test',
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        };
        await admin.from('entitlement_grants').insert({ user_id: host.id, ...grant });
        for (const s of suitors)
          await admin.from('entitlement_grants').insert({ user_id: s.id, ...grant });

        const created = await rpcAs(
          host.id,
          `select public.create_blind_date() as eid`,
          []
        );
        const ev = created[0].eid;
        assert.ok(ev, 'room created');
        events.push(ev);

        for (const s of suitors) {
          const j = await rpcAs(s.id, `select public.join_blind_date('${ev}')`, []);
          assert.ok(j?.[0], `${s.email} joined`);
        }

        // The minute hand drives the phases; the test rewinds the round
        // clock and calls advance directly. Deterministic: the event stays
        // 'open' with a future starts_at, so the live cron never touches it.
        const rewind = async () => {
          await pool`update public.blind_date_rounds set phase_started_at = now() - interval '2 minutes' where event_id = ${ev}`;
        };
        const advance = async () => {
          await pool`select public.advance_blind_date(${ev})`;
        };

        // Round 0: question -> answers -> tally to suitor 0.
        await advance(); // creates round 0 (question phase)
        await rpcAs(
          host.id,
          `select public.submit_blind_question('${ev}', 0, 'What is your spirit animal?')`,
          []
        );
        await rewind();
        await advance(); // -> answer phase
        for (let i = 0; i < 3; i++) {
          await rpcAs(
            suitors[i].id,
            `select public.submit_blind_answer('${ev}', 0, 'Answer ${i}')`,
            []
          );
        }
        await rewind();
        await advance(); // -> selection phase
        await rpcAs(
          host.id,
          `select public.select_blind_tally('${ev}', 0, '${suitors[0].id}')`,
          []
        );
        await rewind();
        await advance(); // round 0 done -> round 1 created

        // Rounds 1-3: suitor 0 gets every tally -> 4-0 clean win.
        for (let r = 1; r < 4; r++) {
          await advance(); // the next tick creates the round
          await rpcAs(
            host.id,
            `select public.submit_blind_question('${ev}', ${r}, 'Question ${r}?')`,
            []
          );
          await rewind();
          await advance();
          for (let i = 0; i < 3; i++) {
            await rpcAs(
              suitors[i].id,
              `select public.submit_blind_answer('${ev}', ${r}, 'Answer ${r}-${i}')`,
              []
            );
          }
          await rewind();
          await advance();
          await rpcAs(
            host.id,
            `select public.select_blind_tally('${ev}', ${r}, '${suitors[0].id}')`,
            []
          );
          await rewind();
          await advance();
        }
        // Round 3 done, standings decide: unique top -> resolution.
        await advance();

        const { data: evState } = await admin
          .from('events')
          .select('status')
          .eq('id', ev)
          .single();
        assert.equal(evState.status, 'closed', 'room closed after resolution');

        const { data: match } = await admin
          .from('matches')
          .select('id')
          .or(`user_id_a.eq.${host.id},user_id_b.eq.${host.id}`)
          .eq('source', 'blind_date')
          .eq('status', 'active')
          .maybeSingle();
        assert.ok(match, 'the winner matched the host');

        for (const s of suitors) {
          assert.equal(await balance(admin, s.id), 5, `${s.email} paid 15`);
        }
        assert.equal(await balance(admin, host.id), 0, 'host plays free');
      }
    );

    await t.test(
      `finalize under load: ${N} members, one cycle, all holds released cleanly`,
      async () => {
        const members = [];
        for (let i = 0; i < N; i++) {
          const m = await makeUser(admin, stamp, `fz${i}`);
          userIds.push(m.id);
          await credit(admin, m.id, 5);
          members.push(m);
        }
        // The whole cycle runs inside one transaction that rolls back — the
        // real minute-cron (which is live and working now) never sees the
        // event, so the run is deterministic. The event, joins, and the
        // finalize pass are all transactional; only the throwaway users
        // and their seed credits are committed.
        const one = postgres(POOL_URL, { max: 1, ssl: 'require', prepare: false });
        try {
          await one.unsafe('begin');
          const [{ id: ev }] = await one`
            insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
            values ('dance_floor', 'silver', ${new Date(Date.now() - 5 * 60 * 1000).toISOString()}, 'open', 3, 2)
            returning id
          `;
          events.push(ev);
          for (const m of members) {
            await one`select set_config('request.jwt.claims', ${JSON.stringify({
              sub: m.id,
              role: 'authenticated'
            })}, true)`;
            await one`select public.join_event(${ev})`;
          }
          const reserved = await one`select count(*)::int as n from public.event_entries where event_id = ${ev} and status = 'reserved'`;
          assert.equal(reserved[0].n, N, 'all reserved before finalize');

          await one`select public.finalize_events()`;
          const [{ status }] = await one`select status from public.events where id = ${ev}`;
          assert.equal(status, 'closed', 'event closed after the cycle');
          const released = await one`select count(*)::int as n from public.event_entries where event_id = ${ev} and status = 'released'`;
          assert.equal(released[0].n, N, `all ${N} holds released (no-match refund)`);
          const debited = await one`select count(*)::int as n from public.token_ledger where user_id in ${one(members.map((m) => m.id))} and delta < 0`;
          assert.equal(debited[0].n, 0, 'no debits for released holds');
        } finally {
          await one.unsafe('rollback').catch(() => {});
          await one.end();
        }
        console.log(
          `  finalize: ${N} entries cycled (reserved -> released) in one call, ledger untouched`
        );
      }
    );
  }
);
