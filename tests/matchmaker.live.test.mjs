// Matchmaker live tests (PRD: docs/PRD-matchmaker.md). LIVE: exercises the
// real RPCs against the hosted DB with throwaway members, then cleans every
// row it touched. Proves the game end to end:
//   - draft phase: server-filtered candidates, 2-pick cap, no real likes
//   - board build: 2 stakes + 6 randoms, 8 pairs / 16 cards
//   - flip logic: reveal → match (2 matches win) / strike (3 strikes lose)
//   - unlock: one first impression per matched pair, its own allowance
//   - accept: conversation + match + recipient earns the sender-floor gift
//   - decline: silent end + sender earns their own-floor consolation gift
//   - plays dial: 2/3/4/5 — silver burns two boards then refuses
//   - exclusivity: buy_gift refuses the matchmaker-only catalog items
//
//   RUN_LIVE_TESTS=1 node --test tests/matchmaker.live.test.mjs
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

// Throwaway member: verified, gendered, photo'd — a real candidate for the
// draft + board pools (server-side compatible() needs the identity set).
async function makeUser(admin, anon, stamp, tag, gender) {
  const email = `mmtest-${tag}-${stamp}@clubcheeky.test`;
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
    .update({
      verified_at: new Date().toISOString(),
      gender,
      interested_in: 'everyone'
    })
    .eq('id', data.user.id);
  if (pErr) throw new Error(`verify: ${pErr.message}`);
  const { error: phErr } = await admin.from('photos').insert({
    user_id: data.user.id,
    storage_path: `test/mm-${data.user.id}.png`,
    position: 0,
    is_primary: true
  });
  if (phErr) throw new Error(`photo: ${phErr.message}`);
  return { id: data.user.id, email, token: s.session.access_token };
}

async function draft(token, target) {
  return rpc(token, 'matchmaker_pick_draft', { p_target: target });
}
async function flip(token, cardId) {
  return rpc(token, 'matchmaker_flip', { p_card_id: cardId });
}

// Sign in as an existing user (password is reset first) and return a token.
async function signInAs(admin, anon, userId) {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const pw = `${randomBytes(9).toString('base64url')}!A7`;
  await admin.auth.admin.updateUserById(userId, { password: pw });
  const { data: s } = await anon.auth.signInWithPassword({
    email: u.user.email,
    password: pw
  });
  return s.session.access_token;
}

test(
  'Matchmaker game (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!URL || !SERVICE_KEY || !ANON_KEY)
      return t.skip('Supabase env missing');

    const admin = createClient(URL, SERVICE_KEY);
    const anon = createClient(URL, ANON_KEY);
    const stamp = Date.now();
    const userIds = [];
    const boardIds = [];
    const unlockIds = [];
    const matchIds = [];
    const convIds = [];
    const giftIds = [];

    t.after(async () => {
      const chunkIn = async (table, col, ids) => {
        for (let i = 0; i < ids.length; i += 100) {
          await admin.from(table).delete().in(col, ids.slice(i, i + 100));
        }
      };
      if (unlockIds.length) await chunkIn('matchmaker_unlocks', 'id', unlockIds);
      if (boardIds.length) await chunkIn('matchmaker_boards', 'id', boardIds);
      if (convIds.length) {
        await chunkIn('messages', 'conversation_id', convIds);
        await chunkIn('conversations', 'id', convIds);
      }
      if (giftIds.length) await chunkIn('gift_inventory', 'id', giftIds);
      if (matchIds.length) await chunkIn('matches', 'id', matchIds);
      if (userIds.length) {
        // Cover every side of the pair FKs so deleteUser never trips a NO
        // ACTION row (matches/conversations/boards may have been created on
        // either side, and a mid-run failure can orphan them).
        await chunkIn('matchmaker_unlocks', 'sender_id', userIds);
        await chunkIn('matchmaker_unlocks', 'recipient_id', userIds);
        await chunkIn('matchmaker_boards', 'user_id', userIds);
        await chunkIn('matches', 'user_id_a', userIds);
        await chunkIn('matches', 'user_id_b', userIds);
        await chunkIn('conversations', 'user_id_a', userIds);
        await chunkIn('conversations', 'user_id_b', userIds);
        await chunkIn('gift_inventory', 'user_id', userIds);
        await chunkIn('gift_sends', 'sender_id', userIds);
        await chunkIn('gift_sends', 'recipient_id', userIds);
        await chunkIn('likes', 'liker_id', userIds);
        await chunkIn('likes', 'likee_id', userIds);
        await chunkIn('l3_picks', 'picker_id', userIds);
        await chunkIn('l3_picks', 'target_id', userIds);
        await chunkIn('users', 'id', userIds);
        await chunkIn('photos', 'user_id', userIds);
      }
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

    let a;
    let d1;
    let d2;
    let b;
    let r1;
    let boardAId;
    let boardBId;

    await t.test('draft phase: filtered candidates, 2-pick cap, no real likes', async () => {
      const crew = [];
      a = await makeUser(admin, anon, stamp, 'a', 'lady');
      crew.push(a);
      d1 = await makeUser(admin, anon, stamp, 'd1', 'gentleman');
      crew.push(d1);
      d2 = await makeUser(admin, anon, stamp, 'd2', 'gentleman');
      crew.push(d2);
      crew.push(await makeUser(admin, anon, stamp, 'r4', 'gentleman'));
      b = await makeUser(admin, anon, stamp, 'b', 'gentleman');
      crew.push(b);
      r1 = await makeUser(admin, anon, stamp, 'r1', 'lady');
      crew.push(r1);
      crew.push(await makeUser(admin, anon, stamp, 'r2', 'lady'));
      crew.push(await makeUser(admin, anon, stamp, 'r3', 'lady'));
      crew.push(await makeUser(admin, anon, stamp, 'r5', 'gentleman'));
      crew.push(await makeUser(admin, anon, stamp, 'r6', 'gentleman'));
      crew.push(await makeUser(admin, anon, stamp, 'r7', 'lady'));
      crew.push(await makeUser(admin, anon, stamp, 'r8', 'gentleman'));
      userIds.push(...crew.map((u) => u.id));

      const board = await rpc(a.token, 'matchmaker_start_draft', {});
      assert.ok(!board.error, board.error?.message);
      assert.ok(board.data, 'draft board created');

      const { data: cands, error: cErr } = await rpc(
        a.token,
        'matchmaker_draft_candidates',
        {}
      );
      assert.ok(!cErr, cErr?.message);
      assert.ok(Array.isArray(cands) && cands.length >= 2, 'candidates present');
      assert.ok(cands.every((c) => c.id !== a.id), 'never the caller');
      assert.ok(cands.every((c) => c.photo_path), 'every candidate has a photo');
      assert.ok(cands.every((c) => c.picked === false), 'nothing picked yet');

      const one = await draft(a.token, d1.id);
      assert.ok(!one.error, one.error?.message);
      const { data: likes } = await admin
        .from('likes')
        .select('likee_id')
        .eq('liker_id', a.id);
      assert.equal((likes ?? []).length, 0, 'drafts never write real likes');

      const two = await draft(a.token, d2.id);
      assert.ok(!two.error, two.error?.message);

      const third = await draft(a.token, r1.id);
      assert.ok(
        third.error && third.error.message.includes('draft_full'),
        '2-pick cap enforced'
      );

      const { data: after } = await rpc(a.token, 'matchmaker_draft_candidates', {});
      const picked = (after ?? []).filter((c) => c.picked);
      assert.equal(picked.length, 2, 'picked flag reflects the drafts');
    });

    await t.test('start_board: 16 cards, 8 pairs, the drafts are the stakes', async () => {
      const { data: rows, error } = await rpc(a.token, 'matchmaker_start_board', {});
      assert.ok(!error, error?.message);
      assert.equal(rows.length, 16, '16 cards');
      boardAId = rows[0].board_id;
      boardIds.push(boardAId);

      const { data: cards } = await admin
        .from('matchmaker_cards')
        .select('id, target_id, pair_id, is_stake')
        .eq('board_id', boardAId);
      const pairs = new Set(cards.map((c) => c.pair_id));
      assert.equal(pairs.size, 8, '8 pairs');
      const stakeTargets = new Set(
        cards.filter((c) => c.is_stake).map((c) => c.target_id)
      );
      assert.equal(stakeTargets.size, 2, 'two stakes');
      assert.ok(
        stakeTargets.has(d1.id) && stakeTargets.has(d2.id),
        'the drafts are the stakes'
      );
      assert.equal(
        cards.filter((c) => !c.is_stake).length,
        12,
        'six randoms × 2'
      );
    });

    await t.test('flip: reveal, match, strike, and the 2-match win', async () => {
      const { data: cards } = await admin
        .from('matchmaker_cards')
        .select('id, target_id, pair_id')
        .eq('board_id', boardAId);
      const byPair = new Map();
      for (const c of cards) {
        byPair.set(c.pair_id, [...(byPair.get(c.pair_id) ?? []), c]);
      }
      const pairs = [...byPair.values()];

      // Match #1.
      const [c1, c2] = pairs[0];
      const f1 = await flip(a.token, c1.id);
      assert.ok(!f1.error, f1.error?.message);
      assert.equal(f1.data[0].is_match, null, 'first flip only reveals');
      assert.ok(f1.data[0].target_id, 'first flip reveals the face');

      const f2 = await flip(a.token, c2.id);
      assert.ok(!f2.error, f2.error?.message);
      assert.equal(f2.data[0].is_match, true, 'same pair = match');
      assert.equal(f2.data[0].matches_found, 1, 'one match on the board');
      assert.equal(f2.data[0].first_card_id, c1.id, 'both cards reported up');

      // Strike #1: two cards from different pairs.
      const [c3] = pairs[1];
      const [c5] = pairs[2];
      const s1 = await flip(a.token, c3.id);
      assert.ok(!s1.error, s1.error?.message);
      assert.equal(s1.data[0].is_match, null);
      const s2 = await flip(a.token, c5.id);
      assert.ok(!s2.error, s2.error?.message);
      assert.equal(s2.data[0].is_match, false, 'different pairs = strike');
      assert.equal(s2.data[0].strikes, 1, 'strike counter ticks');

      // Match #2 ends the board as a win.
      const [c6, c7] = pairs[3];
      const m1 = await flip(a.token, c6.id);
      assert.ok(!m1.error, m1.error?.message);
      const m2 = await flip(a.token, c7.id);
      assert.ok(!m2.error, m2.error?.message);
      assert.equal(m2.data[0].is_match, true);
      assert.equal(m2.data[0].matches_found, 2, 'two matches');
      assert.equal(m2.data[0].board_status, 'won', 'board won');
    });

    await t.test('send_unlock: one first impression per matched pair, its own allowance', async () => {
      const { data: matchedCards } = await admin
        .from('matchmaker_cards')
        .select('id, target_id')
        .eq('board_id', boardAId)
        .eq('matched', true)
        .order('id');

      const { data: unlockId, error } = await rpc(a.token, 'matchmaker_send_unlock', {
        p_card_id: matchedCards[0].id,
        p_message: 'I found you on the board — hi!'
      });
      assert.ok(!error, error?.message);
      assert.ok(unlockId, 'unlock created');
      unlockIds.push(unlockId);

      const dup = await rpc(a.token, 'matchmaker_send_unlock', {
        p_card_id: matchedCards[0].id,
        p_message: 'again?'
      });
      assert.ok(
        dup.error && dup.error.message.includes('unlock_already_sent'),
        'one unlock per person per board'
      );

      const { data: msgs } = await admin
        .from('messages')
        .select('id')
        .eq('sender_id', a.id);
      assert.equal((msgs ?? []).length, 0, 'unlock rides its own allowance');
    });

    await t.test('accept: chat opens, both can talk, recipient earns the sender-floor gift', async () => {
      const { data: matchedCards } = await admin
        .from('matchmaker_cards')
        .select('target_id')
        .eq('board_id', boardAId)
        .eq('matched', true)
        .order('id');
      const target = matchedCards[0].target_id;

      const token = await signInAs(admin, anon, target);
      const { data: inc } = await rpc(token, 'matchmaker_incoming', {});
      assert.ok(inc.length === 1, 'recipient sees the pending unlock');
      assert.equal(inc[0].message, 'I found you on the board — hi!');

      const { error: accErr } = await rpc(token, 'matchmaker_respond_unlock', {
        p_unlock_id: unlockIds[0],
        p_accept: true
      });
      assert.ok(!accErr, accErr?.message);

      const { data: unlock } = await admin
        .from('matchmaker_unlocks')
        .select('status, conversation_id, responded_at')
        .eq('id', unlockIds[0])
        .single();
      assert.equal(unlock.status, 'accepted');
      assert.ok(unlock.conversation_id, 'conversation created');
      assert.ok(unlock.responded_at, 'responded_at stamped');
      convIds.push(unlock.conversation_id);

      const { data: msgs } = await admin
        .from('messages')
        .select('sender_id, body')
        .eq('conversation_id', unlock.conversation_id);
      assert.equal(msgs.length, 1, 'the unlock message is message one');
      assert.equal(msgs[0].sender_id, a.id, 'sent as the finder');

      const { data: matches } = await admin
        .from('matches')
        .select('id, source, status, user_id_a, user_id_b')
        .or(`user_id_a.eq.${a.id},user_id_b.eq.${a.id}`);
      const pair = (matches ?? []).find(
        (m) =>
          (m.user_id_a === a.id && m.user_id_b === target) ||
          (m.user_id_a === target && m.user_id_b === a.id)
      );
      assert.ok(pair, 'acceptance creates the match');
      assert.equal(pair.source, 'matchmaker');
      assert.equal(pair.status, 'active');
      matchIds.push(pair.id);

      const { data: gifts } = await admin
        .from('gift_inventory')
        .select('id, catalog_id')
        .eq('user_id', target);
      assert.equal((gifts ?? []).length, 1, 'recipient got one gift');
      const { data: cat } = await admin
        .from('gift_catalog')
        .select('slug, matchmaker_only')
        .eq('id', gifts[0].catalog_id)
        .single();
      assert.equal(cat.slug, 'matchmaker_silver', 'sender-floor variant');
      assert.equal(cat.matchmaker_only, true, 'exclusive catalog item');
      giftIds.push(gifts[0].id);
    });

    await t.test('decline: silent end, sender earns their own-floor consolation gift', async () => {
      const { data: bboard } = await rpc(b.token, 'matchmaker_start_draft', {});
      assert.ok(bboard, 'b drafts');
      await draft(b.token, r1.id);
      await draft(b.token, a.id);
      const { data: brows, error: bErr } = await rpc(b.token, 'matchmaker_start_board', {});
      assert.ok(!bErr, bErr?.message);
      boardBId = brows[0].board_id;
      boardIds.push(boardBId);

      const { data: cards } = await admin
        .from('matchmaker_cards')
        .select('id, target_id')
        .eq('board_id', boardBId);
      const r1Cards = cards.filter((c) => c.target_id === r1.id);
      assert.equal(r1Cards.length, 2, 'r1 is on b\'s board as a stake');

      await flip(b.token, r1Cards[0].id);
      const fm = await flip(b.token, r1Cards[1].id);
      assert.equal(fm.data[0].is_match, true, 'r1 pair matched');

      const { data: unlockId, error: uErr } = await rpc(b.token, 'matchmaker_send_unlock', {
        p_card_id: r1Cards[0].id,
        p_message: 'You were the pair I wanted — say hi?'
      });
      assert.ok(!uErr, uErr?.message);
      unlockIds.push(unlockId);

      const r1Token = await signInAs(admin, anon, r1.id);
      const { data: inc } = await rpc(r1Token, 'matchmaker_incoming', {});
      assert.equal(inc.length, 1, 'r1 sees b\'s unlock');

      const { error: decErr } = await rpc(r1Token, 'matchmaker_respond_unlock', {
        p_unlock_id: unlockId,
        p_accept: false
      });
      assert.ok(!decErr, decErr?.message);

      const { data: u2 } = await admin
        .from('matchmaker_unlocks')
        .select('status, conversation_id, responded_at, gift_inventory_id')
        .eq('id', unlockId)
        .single();
      assert.equal(u2.status, 'declined');
      assert.equal(u2.conversation_id, null, 'no conversation on decline');
      assert.ok(u2.responded_at, 'responded_at stamped');
      assert.ok(u2.gift_inventory_id, 'consolation gift linked to the unlock');

      const { data: m2 } = await admin
        .from('matches')
        .select('id, user_id_a, user_id_b')
        .or(`user_id_a.eq.${b.id},user_id_b.eq.${b.id}`);
      const pair = (m2 ?? []).find(
        (m) =>
          (m.user_id_a === b.id && m.user_id_b === r1.id) ||
          (m.user_id_a === r1.id && m.user_id_b === b.id)
      );
      assert.equal(pair, undefined, 'no match on decline');

      const { data: bgifts } = await admin
        .from('gift_inventory')
        .select('id, catalog_id')
        .eq('user_id', b.id);
      assert.equal((bgifts ?? []).length, 1, 'sender got the consolation gift');
      const { data: bcat } = await admin
        .from('gift_catalog')
        .select('slug')
        .eq('id', bgifts[0].catalog_id)
        .single();
      assert.equal(bcat.slug, 'matchmaker_silver', 'their own floor variant');
      giftIds.push(bgifts[0].id);
    });

    await t.test('3 strikes lose — a board with one match ends quiet', async () => {
      const { data: cards } = await admin
        .from('matchmaker_cards')
        .select('id, pair_id, matched')
        .eq('board_id', boardBId);
      const byPair = new Map();
      for (const c of cards) {
        byPair.set(c.pair_id, [...(byPair.get(c.pair_id) ?? []), c]);
      }
      const pairs = [...byPair.values()];
      const unused = pairs.filter((p) => !p[0].matched);
      assert.ok(unused.length >= 3, 'enough unmatched pairs to strike out');

      await flip(b.token, unused[0][0].id);
      const s1 = await flip(b.token, unused[1][0].id);
      assert.equal(s1.data[0].is_match, false);
      assert.equal(s1.data[0].strikes, 1);

      await flip(b.token, unused[2][0].id);
      const s2 = await flip(b.token, unused[3][0].id);
      assert.equal(s2.data[0].is_match, false);
      assert.equal(s2.data[0].strikes, 2);

      await flip(b.token, unused[4][0].id);
      const s3 = await flip(b.token, unused[5][0].id);
      assert.equal(s3.data[0].is_match, false);
      assert.equal(s3.data[0].strikes, 3);
      assert.equal(s3.data[0].board_status, 'lost', 'board lost');
    });

    await t.test('plays dial: silver burns two boards, then the third is refused', async () => {
      // b used one board (the loss above). Play 2 builds; play 3 refuses.
      const { data: bd } = await rpc(b.token, 'matchmaker_start_draft', {});
      assert.ok(bd, 'new draft board');
      await draft(b.token, d1.id);
      await draft(b.token, d2.id);
      const { data: rows, error: e2 } = await rpc(b.token, 'matchmaker_start_board', {});
      assert.ok(!e2, e2?.message);
      assert.equal(rows.length, 16, 'second play builds');
      await admin.from('matchmaker_cards').delete().eq('board_id', rows[0].board_id);
      await admin.from('matchmaker_boards').delete().eq('id', rows[0].board_id);

      const { data: bd2 } = await rpc(b.token, 'matchmaker_start_draft', {});
      assert.ok(bd2);
      await draft(b.token, d1.id);
      await draft(b.token, d2.id);
      const { error: e3 } = await rpc(b.token, 'matchmaker_start_board', {});
      assert.ok(
        e3 && e3.message.includes('daily_plays_limit'),
        'third start_board refused by the dial'
      );

      const { data: ts } = await rpc(b.token, 'taskbar_state', {});
      assert.equal(ts[0].matchmaker_plays_left, 0, 'taskbar reports 0 plays left');
    });

    await t.test('exclusivity: buy_gift refuses the matchmaker-only items', async () => {
      const { error } = await rpc(a.token, 'buy_gift', { p_slug: 'matchmaker_silver' });
      assert.ok(
        error && error.message.includes('gift_not_purchasable'),
        'exclusive gifts can never be bought'
      );
    });
  }
);
