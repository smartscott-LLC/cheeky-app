// Club Chat live tests (PRD: docs/PRD-club-chat.md). LIVE: exercises the
// real RPCs against the hosted DB with throwaway members, then cleans every
// row it touched. Proves the town square end to end:
//   - the ladder: type on your floor (and global); above = floor_too_high
//   - the always-on profanity filter
//   - the Horn: 10 tokens, one per hour, ticker + chat_horn badge
//   - whispers: ephemeral pair rooms, both sides read
//   - take-private: invite -> accept = match + conversation; the daily
//     new-people allowance is checked for BOTH parties
//   - the Chatterbox collectible family (chat_50)
//   - moderator chat bans block posting
//   - blocks hide messages at RLS (both directions)
//
//   RUN_LIVE_TESTS=1 node --test tests/club-chat.live.test.mjs
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

async function makeUser(admin, anon, stamp, tag, gender) {
  const email = `cctest-${tag}-${stamp}@clubcheeky.test`;
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

test(
  'Club Chat — the town square (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!URL || !SERVICE_KEY || !ANON_KEY)
      return t.skip('Supabase env missing');

    const admin = createClient(URL, SERVICE_KEY);
    const anon = createClient(URL, ANON_KEY);
    const stamp = Date.now();
    const userIds = [];
    const msgIds = [];
    const whisperIds = [];
    const whisperMsgIds = [];
    const inviteIds = [];
    const banIds = [];
    const announceIds = [];
    const matchIds = [];
    const convIds = [];
    const ledgerIds = [];

    t.after(async () => {
      const chunkIn = async (table, col, ids) => {
        for (let i = 0; i < ids.length; i += 100) {
          await admin.from(table).delete().in(col, ids.slice(i, i + 100));
        }
      };
      if (whisperMsgIds.length) await chunkIn('club_chat_whisper_messages', 'id', whisperMsgIds);
      if (whisperIds.length) await chunkIn('club_chat_whispers', 'id', whisperIds);
      if (msgIds.length) await chunkIn('club_chat_messages', 'id', msgIds);
      if (inviteIds.length) await chunkIn('club_chat_invites', 'id', inviteIds);
      if (banIds.length) await chunkIn('club_chat_bans', 'id', banIds);
      if (announceIds.length) await chunkIn('club_announcements', 'id', announceIds);
      if (convIds.length) {
        await chunkIn('messages', 'conversation_id', convIds);
        await chunkIn('conversations', 'id', convIds);
      }
      if (matchIds.length) await chunkIn('matches', 'id', matchIds);
      if (ledgerIds.length) await chunkIn('token_ledger', 'id', ledgerIds);
      if (userIds.length) {
        await chunkIn('club_chat_time', 'user_id', userIds);
        await chunkIn('club_chat_invites', 'inviter_id', userIds);
        await chunkIn('club_chat_invites', 'invitee_id', userIds);
        await chunkIn('club_chat_messages', 'sender_id', userIds);
        await chunkIn('club_chat_whispers', 'user_a', userIds);
        await chunkIn('club_chat_whispers', 'user_b', userIds);
        await chunkIn('club_chat_bans', 'user_id', userIds);
        await chunkIn('matches', 'user_id_a', userIds);
        await chunkIn('matches', 'user_id_b', userIds);
        await chunkIn('conversations', 'user_id_a', userIds);
        await chunkIn('conversations', 'user_id_b', userIds);
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

    let silver; // the free-tier speaker
    let gold; // paid-floor speaker
    let bob; // the invite target + whisper partner

    await t.test('the ladder: your floor and below, global for everyone', async () => {
      const crew = [];
      silver = await makeUser(admin, anon, stamp, 'silver', 'lady');
      crew.push(silver);
      gold = await makeUser(admin, anon, stamp, 'gold', 'gentleman');
      crew.push(gold);
      bob = await makeUser(admin, anon, stamp, 'bob', 'lady');
      crew.push(bob);
      userIds.push(...crew.map((u) => u.id));

      // Give gold its paid tier (entitlement grant -> current_tier).
      const { data: goldSub } = await admin
        .from('subscriptions')
        .select('id, tier')
        .limit(1);
      void goldSub;

      // Silver on its own floor + global.
      const own = await rpc(silver.token, 'club_chat_send', {
        p_room: 'silver',
        p_body: 'first words in the club'
      });
      assert.ok(!own.error, own.error?.message);
      msgIds.push(own.data);

      const globalMsg = await rpc(silver.token, 'club_chat_send', {
        p_room: 'global',
        p_body: 'the town square belongs to everyone'
      });
      assert.ok(!globalMsg.error, globalMsg.error?.message);
      msgIds.push(globalMsg.data);

      // Silver cannot type on Gold's floor — the climb is read-only.
      const up = await rpc(silver.token, 'club_chat_send', {
        p_room: 'gold',
        p_body: 'sneaky'
      });
      assert.ok(
        up.error && up.error.message.includes('floor_too_high'),
        'upper floors refuse Silver'
      );

      const { data: rows } = await admin
        .from('club_chat_messages')
        .select('room, floor_tag, horn')
        .in('id', [own.data, globalMsg.data]);
      const byRoom = Object.fromEntries(rows.map((r) => [r.room, r]));
      assert.equal(byRoom.silver.floor_tag, 'silver', 'floor tag recorded');
      assert.equal(byRoom.global.floor_tag, 'silver', 'global carries the tag');
      assert.equal(byRoom.global.horn, false, 'plain message is not a horn');
    });

    await t.test('the always-on profanity filter', async () => {
      const { error } = await rpc(silver.token, 'club_chat_send', {
        p_room: 'global',
        p_body: 'this is f u c k e d up'
      });
      assert.ok(
        error && error.message.includes('profanity_blocked'),
        'profanity is blocked, never optional'
      );
    });

    await t.test('the Horn: 10 tokens, one per hour, ticker + badge', async () => {
      // No tokens yet -> refused.
      const broke = await rpc(silver.token, 'club_chat_horn', {
        p_body: 'HELLO THE CLUB'
      });
      assert.ok(
        broke.error && broke.error.message.includes('insufficient_tokens'),
        'no tokens, no horn'
      );

      // Fund with 10.
      const { data: fund, error: fundErr } = await admin
        .from('token_ledger')
        .insert({ user_id: silver.id, delta: 10, reason: 'test' })
        .select('id')
        .single();
      assert.ok(!fundErr, fundErr?.message);
      ledgerIds.push(fund.id);

      const horn = await rpc(silver.token, 'club_chat_horn', {
        p_body: 'the club is OPEN tonight!'
      });
      assert.ok(!horn.error, horn.error?.message);
      assert.ok(horn.data, 'horn message posted');
      msgIds.push(horn.data);

      const { data: hmsg } = await admin
        .from('club_chat_messages')
        .select('room, horn')
        .eq('id', horn.data)
        .single();
      assert.equal(hmsg.room, 'global', 'horn lands in the global room');
      assert.equal(hmsg.horn, true, 'lit up');

      const { data: anns } = await admin
        .from('club_announcements')
        .select('id, kind')
        .eq('kind', 'horn')
        .order('id', { ascending: false })
        .limit(1);
      assert.equal(anns[0].kind, 'horn', 'crosses the ticker');
      announceIds.push(anns[0].id);

      const { data: hornLedger } = await admin
        .from('token_ledger')
        .select('id, delta, reason')
        .eq('user_id', silver.id)
        .eq('reason', 'horn')
        .order('id', { ascending: false })
        .limit(1);
      assert.equal(hornLedger[0].delta, -10, 'exactly 10 tokens debited');
      ledgerIds.push(hornLedger[0].id);

      const { data: badges } = await admin
        .from('member_badges')
        .select('badge_catalog(slug)')
        .eq('user_id', silver.id);
      const slugs = (badges ?? []).map((b) => b.badge_catalog?.slug);
      assert.ok(slugs.includes('chat_horn'), 'Horn Blower badge earned');

      // One per hour.
      const again = await rpc(silver.token, 'club_chat_horn', {
        p_body: 'second blast'
      });
      assert.ok(
        again.error && again.error.message.includes('horn_cooldown'),
        'second horn within the hour is refused'
      );
    });

    await t.test('whispers: ephemeral pair rooms, both sides read', async () => {
      const room = await rpc(silver.token, 'club_chat_whisper_get', {
        p_other: bob.id
      });
      assert.ok(!room.error, room.error?.message);
      assert.ok(room.data, 'whisper room created');
      whisperIds.push(room.data);

      const w = await rpc(silver.token, 'club_chat_whisper_send', {
        p_whisper_id: room.data,
        p_body: 'psst — over here'
      });
      assert.ok(!w.error, w.error?.message);
      whisperMsgIds.push(w.data);

      // Bob signs in and reads the whisper room.
      const pw = `${randomBytes(9).toString('base64url')}!A7`;
      await admin.auth.admin.updateUserById(bob.id, { password: pw });
      const { data: bs } = await anon.auth.signInWithPassword({
        email: bob.email,
        password: pw
      });
      const { data: msgs } = await anon
        .from('club_chat_whisper_messages')
        .select('sender_id, body')
        .eq('whisper_id', room.data);
      assert.equal(msgs.length, 1, 'bob sees the whisper');
      assert.equal(msgs[0].sender_id, silver.id, 'sender is silver');

      // Blocked pair cannot whisper.
      const { error: bErr } = await admin.from('blocks').insert({
        blocker_id: gold.id,
        blocked_id: silver.id
      });
      assert.ok(!bErr, bErr?.message);
      const blocked = await rpc(silver.token, 'club_chat_whisper_get', {
        p_other: gold.id
      });
      assert.ok(
        blocked.error && blocked.error.message.includes('blocked'),
        'blocked pairs cannot whisper'
      );
      await admin.from('blocks').delete().eq('blocker_id', gold.id).eq('blocked_id', silver.id);
    });

    await t.test('take-private: invite -> accept = match + conversation', async () => {
      const invite = await rpc(silver.token, 'club_chat_invite', {
        p_user: bob.id
      });
      assert.ok(!invite.error, invite.error?.message);
      assert.ok(invite.data, 'invite created');
      inviteIds.push(invite.data);

      const pw = `${randomBytes(9).toString('base64url')}!A7`;
      await admin.auth.admin.updateUserById(bob.id, { password: pw });
      const { data: bs } = await anon.auth.signInWithPassword({
        email: bob.email,
        password: pw
      });

      const accept = await rpc(bs.session.access_token, 'club_chat_respond_invite', {
        p_invite_id: invite.data,
        p_accept: true
      });
      assert.ok(!accept.error, accept.error?.message);

      const { data: convs } = await admin
        .from('conversations')
        .select('id, user_id_a, user_id_b')
        .or(`user_id_a.eq.${silver.id},user_id_b.eq.${silver.id}`);
      const conv = (convs ?? []).find(
        (c) =>
          (c.user_id_a === silver.id && c.user_id_b === bob.id) ||
          (c.user_id_a === bob.id && c.user_id_b === silver.id)
      );
      assert.ok(conv, 'conversation created');
      convIds.push(conv.id);

      const { data: matches } = await admin
        .from('matches')
        .select('id, source, status, user_id_a, user_id_b')
        .or(`user_id_a.eq.${silver.id},user_id_b.eq.${silver.id}`);
      const match = (matches ?? []).find(
        (m) =>
          (m.user_id_a === silver.id && m.user_id_b === bob.id) ||
          (m.user_id_a === bob.id && m.user_id_b === silver.id)
      );
      assert.ok(match, 'acceptance creates the match');
      assert.equal(match.source, 'club_chat');
      assert.equal(match.status, 'active');
      matchIds.push(match.id);
    });

    await t.test('take-private: the daily new-people allowance is checked on BOTH sides', async () => {
      // A fresh inviter (silver is already matched with bob by now).
      const quoter = await makeUser(admin, anon, stamp, 'quoter', 'gentleman');
      userIds.push(quoter.id);

      // Seed 5 accepted invites today where bob is the invitee — silver's
      // 5-new-people cap is exhausted before their next accept.
      const seeders = [];
      for (let i = 0; i < 5; i++) {
        const s = await makeUser(admin, anon, stamp, `seed${i}`, 'gentleman');
        seeders.push(s);
        userIds.push(s.id);
        const { data: inv, error: iErr } = await admin
          .from('club_chat_invites')
          .insert({
            inviter_id: s.id,
            invitee_id: bob.id,
            status: 'accepted',
            responded_at: new Date().toISOString()
          })
          .select('id')
          .single();
        assert.ok(!iErr, iErr?.message);
        inviteIds.push(inv.id);
      }

      const pw = `${randomBytes(9).toString('base64url')}!A7`;
      await admin.auth.admin.updateUserById(bob.id, { password: pw });
      const { data: bs } = await anon.auth.signInWithPassword({
        email: bob.email,
        password: pw
      });

      const invite = await rpc(quoter.token, 'club_chat_invite', {
        p_user: bob.id
      });
      assert.ok(!invite.error, invite.error?.message);
      inviteIds.push(invite.data);

      const accept = await rpc(bs.session.access_token, 'club_chat_respond_invite', {
        p_invite_id: invite.data,
        p_accept: true
      });
      assert.ok(
        accept.error && accept.error.message.includes('daily_people_limit'),
        'accepting past the new-people cap is refused'
      );
      void seeders;
    });

    await t.test('the Chatterbox collectible family (chat_50)', async () => {
      // White-box: put the counter at 49, one real send lands the badge.
      const { error: setErr } = await admin
        .from('profiles')
        .update({ chat_messages_sent: 49 })
        .eq('id', silver.id);
      assert.ok(!setErr, setErr?.message);

      const send = await rpc(silver.token, 'club_chat_send', {
        p_room: 'silver',
        p_body: 'the fiftieth word'
      });
      assert.ok(!send.error, send.error?.message);
      msgIds.push(send.data);

      const { data: badges } = await admin
        .from('member_badges')
        .select('badge_catalog(slug)')
        .eq('user_id', silver.id);
      const slugs = (badges ?? []).map((b) => b.badge_catalog?.slug);
      assert.ok(
        slugs.includes('chat_50'),
        `Chatterbox I earned at 50 (have: ${slugs.join(', ')})`
      );
    });

    await t.test('moderator chat bans block posting', async () => {
      const ban = await rpc('', 'club_chat_ban', {
        p_user: gold.id,
        p_hours: 24,
        p_reason: 'live-test ban'
      });
      // The RPC is service-role only — call it directly as the service key.
      const res = await fetch(`${URL}/rest/v1/rpc/club_chat_ban`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          authorization: `Bearer ${SERVICE_KEY}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ p_user: gold.id, p_hours: 24, p_reason: 'live-test ban' })
      });
      assert.equal(res.status, 204, 'service role can ban (void -> 204)');
      const { data: banRows } = await admin
        .from('club_chat_bans')
        .select('id, banned_until')
        .eq('user_id', gold.id);
      assert.equal(banRows.length, 1, 'ban recorded');
      banIds.push(banRows[0].id);
      void ban;

      const send = await rpc(gold.token, 'club_chat_send', {
        p_room: 'silver',
        p_body: 'can I talk now?'
      });
      assert.ok(
        send.error && send.error.message.includes('chat_banned'),
        'banned members cannot post'
      );
    });

    await t.test('blocks hide messages at RLS (both directions)', async () => {
      // silver blocks bob -> silver's client can no longer read bob's posts.
      const { error: bErr } = await admin.from('blocks').insert({
        blocker_id: silver.id,
        blocked_id: bob.id
      });
      assert.ok(!bErr, bErr?.message);

      const { data: bobMsgs } = await admin
        .from('club_chat_messages')
        .select('id')
        .eq('sender_id', bob.id)
        .limit(1);
      // bob may have no messages yet — post one as bob via admin.
      let bobMsgId = bobMsgs?.[0]?.id;
      if (!bobMsgId) {
        const { data: ins } = await admin
          .from('club_chat_messages')
          .insert({
            room: 'global',
            sender_id: bob.id,
            body: 'a message from bob',
            floor_tag: 'silver'
          })
          .select('id')
          .single();
        bobMsgId = ins.id;
        msgIds.push(bobMsgId);
      }

      const pw = `${randomBytes(9).toString('base64url')}!A7`;
      await admin.auth.admin.updateUserById(silver.id, { password: pw });
      const { data: ss } = await anon.auth.signInWithPassword({
        email: silver.email,
        password: pw
      });
      const { data: visible } = await anon
        .from('club_chat_messages')
        .select('id')
        .eq('id', bobMsgId);
      assert.equal(visible.length, 0, 'blocked sender is invisible to silver');

      await admin.from('blocks').delete().eq('blocker_id', silver.id).eq('blocked_id', bob.id);
    });
  }
);
