// L³ live tests (PRD: docs/PRD-l3.md). LIVE: exercises the real RPCs
// against the hosted DB with throwaway members, then cleans every row it
// touched. Proves the tier award system end to end:
//   - l3_trio: verified + photo'd candidates, never self, picked excluded
//   - T1 (like+like, like+love): match + 5-message free line each
//   - T2 (love+love): super match + floor-tiered gift + club announcement
//   - Leave is silent — it never matches, even against a love
//   - The free line at the daily cap: reward spends first, then refuses
//
//   RUN_LIVE_TESTS=1 node --test tests/l3.live.test.mjs
//
// Requires Supabase env in env.new (anon + service role).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: 'env.new' });

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SUPER_MATCH_BODY = '💘 A super match just happened at Club Cheeky!';

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

// Throwaway member: verified, gender/interested_in set (so they're a real
// candidate for l3_trio's compatibility pool), signed in with a token.
async function makeUser(admin, anon, stamp, tag, gender = 'lady') {
  const email = `l3test-${tag}-${stamp}@clubcheeky.test`;
  const password = `${randomBytes(9).toString('base64url')}!A7`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { gender, interested_in: 'everyone' }
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const { data: s, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password
  });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  const { error: pErr } = await admin
    .from('profiles')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', data.user.id);
  if (pErr) throw new Error(`verify: ${pErr.message}`);
  return { id: data.user.id, email, token: s.session.access_token };
}

// A real (non-held) photo row so the member appears in l3_trio.
async function addPhoto(admin, userId) {
  const { error } = await admin.from('photos').insert({
    user_id: userId,
    storage_path: `test/l3-${userId}.png`,
    position: 0,
    is_primary: true
  });
  if (error) throw new Error(`photo: ${error.message}`);
}

async function pick(token, target, choice) {
  return rpc(token, 'create_l3_pick', { p_target: target, p_choice: choice });
}

test(
  'L³ tier engine (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!URL || !SERVICE_KEY || !ANON_KEY)
      return t.skip('Supabase env missing');

    const admin = createClient(URL, SERVICE_KEY);
    const anon = createClient(URL, ANON_KEY);
    const stamp = Date.now();
    const userIds = [];
    const matchIds = [];
    const convIds = [];
    const announceIds = [];

    t.after(async () => {
      const chunkIn = async (table, col, ids) => {
        for (let i = 0; i < ids.length; i += 100) {
          await admin.from(table).delete().in(col, ids.slice(i, i + 100));
        }
      };
      if (convIds.length) {
        await chunkIn('messages', 'conversation_id', convIds);
        await chunkIn('conversations', 'id', convIds);
      }
      if (userIds.length) {
        // Stripe-sync row (template's handle_new_user trigger) — NO ACTION FK
        // on auth.users, so GoTrue deleteUser 500s until this row is gone.
        await chunkIn('users', 'id', userIds);
        await chunkIn('l3_picks', 'picker_id', userIds);
        await chunkIn('l3_picks', 'target_id', userIds);
        await chunkIn('l3_rewards', 'user_id', userIds);
        await chunkIn('gift_inventory', 'user_id', userIds);
        await chunkIn('photos', 'user_id', userIds);
      }
      if (matchIds.length) await chunkIn('matches', 'id', matchIds);
      if (announceIds.length)
        await chunkIn('club_announcements', 'id', announceIds);
      const chunk = 25;
      for (let i = 0; i < userIds.length; i += chunk) {
        const results = await Promise.allSettled(
          userIds
            .slice(i, i + chunk)
            .map((id) => admin.auth.admin.deleteUser(id))
        );
        for (const r of results)
          if (r.status === 'rejected')
            console.error(
              'deleteUser failed (check cleanup):',
              r.reason?.message ?? r.reason
            );
      }
    });

    await t.test(
      'l3_trio returns verified candidates with photos, never self, never re-picked',
      async () => {
        const caller = await makeUser(admin, anon, stamp, 'triocaller', 'lady');
        const target = await makeUser(admin, anon, stamp, 'triotarget', 'gentleman');
        userIds.push(caller.id, target.id);
        await addPhoto(admin, caller.id);
        await addPhoto(admin, target.id);

        const { data: first, error } = await rpc(caller.token, 'l3_trio', {});
        assert.ok(!error, error?.message);
        assert.ok(Array.isArray(first) && first.length > 0, 'trio not empty');
        assert.ok(first.length <= 12, 'batch capped at 12');
        assert.ok(
          first.every((p) => p.id !== caller.id),
          'never includes the caller'
        );
        assert.ok(
          first.every((p) => p.photo_path),
          'every candidate has a photo'
        );
        assert.ok(
          first.every(
            (p) =>
              p.id &&
              typeof p.display_name === 'string' &&
              typeof p.gender === 'string' &&
              typeof p.interested_in === 'string' &&
              typeof p.photo_path === 'string'
          ),
          'projection is the browse shape'
        );

        // A pick — even a silent Leave — removes the target from future trios.
        await pick(caller.token, target.id, 'leave');
        const { data: second } = await rpc(caller.token, 'l3_trio', {});
        assert.ok(
          second.every((p) => p.id !== target.id),
          'picked target excluded from next trio'
        );
      }
    );

    await t.test(
      'T1: mutual like → match, tier t1, 5-message free line each',
      async () => {
        const a = await makeUser(admin, anon, stamp, 't1a', 'lady');
        const b = await makeUser(admin, anon, stamp, 't1b', 'gentleman');
        userIds.push(a.id, b.id);

        const one = await pick(a.token, b.id, 'like');
        assert.ok(!one.error, one.error?.message);
        assert.equal(one.data[0].match_id, null, 'no match on first pick');

        const two = await pick(b.token, a.id, 'like');
        assert.ok(!two.error, two.error?.message);
        const matchId = two.data[0].match_id;
        assert.ok(matchId, 'match created on mutual like');
        assert.equal(two.data[0].tier, 't1');
        matchIds.push(matchId);

        const { data: m } = await admin
          .from('matches')
          .select('source, tier, status')
          .eq('id', matchId)
          .single();
        assert.equal(m.source, 'l3');
        assert.equal(m.tier, 't1');
        assert.equal(m.status, 'active');

        const { data: rewards } = await admin
          .from('l3_rewards')
          .select('user_id, messages_left')
          .eq('match_id', matchId);
        assert.equal(rewards.length, 2, 'one reward row per member');
        assert.ok(
          rewards.every((r) => r.messages_left === 5),
          '5 free messages each'
        );
      }
    );

    await t.test(
      'T1: like + love is still T1 (only love+love is T2)',
      async () => {
        const c = await makeUser(admin, anon, stamp, 't1c', 'lady');
        const d = await makeUser(admin, anon, stamp, 't1d', 'gentleman');
        userIds.push(c.id, d.id);

        await pick(c.token, d.id, 'love');
        const { data, error } = await pick(d.token, c.id, 'like');
        assert.ok(!error, error?.message);
        assert.equal(data[0].tier, 't1', 'love+like is T1');
        assert.ok(data[0].match_id);
        matchIds.push(data[0].match_id);
      }
    );

    await t.test(
      'T2: mutual love → super match + floor-tiered gift + announcement',
      async () => {
        const e = await makeUser(admin, anon, stamp, 't2e', 'lady');
        const f = await makeUser(admin, anon, stamp, 't2f', 'gentleman');
        userIds.push(e.id, f.id);

        await pick(e.token, f.id, 'love');
        const { data, error } = await pick(f.token, e.id, 'love');
        assert.ok(!error, error?.message);
        assert.equal(data[0].tier, 't2', 'love+love is T2');
        assert.ok(data[0].match_id);
        matchIds.push(data[0].match_id);

        // The gift lands only when a silver "special" exists in the catalog —
        // assert the invariant either way so a silent skip can't pass.
        const { data: catalog } = await admin
          .from('gift_catalog')
          .select('id')
          .eq('floor', 'silver')
          .eq('kind', 'special')
          .eq('active', true);
        const { data: gifts } = await admin
          .from('gift_inventory')
          .select('user_id, catalog_id, status')
          .in('user_id', [e.id, f.id]);
        const catIds = new Set((catalog ?? []).map((c) => c.id));
        if (catalog?.length) {
          assert.equal(gifts.length, 2, 'both members get a super-match gift');
          assert.ok(
            gifts.every(
              (g) => g.status === 'available' && catIds.has(g.catalog_id)
            ),
            'gift is available and silver-tier'
          );
        } else {
          assert.equal(
            gifts.length,
            0,
            'no silver special catalog item — nothing granted'
          );
        }

        const { data: anns } = await admin
          .from('club_announcements')
          .select('id, body, kind')
          .eq('body', SUPER_MATCH_BODY)
          .gte('created_at', new Date(stamp).toISOString());
        assert.ok(
          anns.some((a) => a.kind === 'gift'),
          'super match is announced (silent loss, public win)'
        );
        for (const a of anns ?? []) announceIds.push(a.id);
      }
    );

    await t.test(
      'Leave is silent — never matches, even against a love',
      async () => {
        const g = await makeUser(admin, anon, stamp, 'leaveg', 'lady');
        const h = await makeUser(admin, anon, stamp, 'leaveh', 'gentleman');
        userIds.push(g.id, h.id);

        await pick(g.token, h.id, 'leave');
        const { data, error } = await pick(h.token, g.id, 'love');
        assert.ok(!error, error?.message);
        assert.equal(data[0].match_id, null, 'no match from a Leave');

        const { data: matches } = await admin
          .from('matches')
          .select('id, user_id_a, user_id_b')
          .or(
            `user_id_a.eq.${g.id},user_id_b.eq.${g.id},user_id_a.eq.${h.id},user_id_b.eq.${h.id}`
          );
        const pair = (matches ?? []).filter(
          (m) =>
            (m.user_id_a === g.id && m.user_id_b === h.id) ||
            (m.user_id_a === h.id && m.user_id_b === g.id)
        );
        assert.equal(pair.length, 0, 'no match row between the pair');
      }
    );

    await t.test(
      'the free line at the daily cap — reward spends, then refuses',
      async () => {
        const e1 = await makeUser(admin, anon, stamp, 'cape1', 'lady');
        const e2 = await makeUser(admin, anon, stamp, 'cape2', 'gentleman');
        userIds.push(e1.id, e2.id);

        await pick(e1.token, e2.id, 'like');
        const { data: settled, error: sErr } = await pick(
          e2.token,
          e1.id,
          'like'
        );
        assert.ok(!sErr, sErr?.message);
        matchIds.push(settled[0].match_id);

        const { data: conv, error: cErr } = await rpc(
          e1.token,
          'get_or_create_conversation',
          { p_other: e2.id }
        );
        assert.ok(!cErr, cErr?.message);
        convIds.push(conv);

        // Silver daily cap is 30 messages — push e1 to the edge.
        const seeds = Array.from({ length: 30 }, (_, i) => ({
          conversation_id: conv,
          sender_id: e1.id,
          body: `cap seed ${i}`
        }));
        const { error: seedErr } = await admin.from('messages').insert(seeds);
        assert.ok(!seedErr, seedErr?.message);

        // Reward path: 5 sends go through at the cap, one allowance each.
        for (let i = 1; i <= 5; i++) {
          const { data, error } = await rpc(e1.token, 'send_message', {
            p_conversation_id: conv,
            p_body: `free line ${i}`
          });
          assert.ok(!error, `send ${i} failed: ${error?.message}`);
          assert.ok(data, `send ${i} returned an id`);
        }

        const { data: left } = await admin
          .from('l3_rewards')
          .select('messages_left')
          .eq('match_id', settled[0].match_id)
          .eq('user_id', e1.id)
          .single();
        assert.equal(left.messages_left, 0, 'allowance exhausted');

        const { error: refused } = await rpc(e1.token, 'send_message', {
          p_conversation_id: conv,
          p_body: 'over the line'
        });
        assert.ok(
          refused && refused.message.includes('daily_message_limit'),
          '6th send refused at the cap'
        );
      }
    );
  }
);
