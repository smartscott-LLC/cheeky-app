// Tiki Taskbar live tests (PRD: docs/PRD-tiki-taskbar.md). LIVE: exercises
// the taskbar_state RPC + the unread pipeline against the hosted DB with
// throwaway members, then cleans every row it touched.
//   - taskbar_state: tier + usage counts for a fresh member (0/0, not
//     checked in), and after a check-in + messages (counts move)
//   - mark_conversation_read: opening a thread clears its unread state
//
//   RUN_LIVE_TESTS=1 node --test tests/taskbar.live.test.mjs
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

async function makeUser(admin, anon, stamp, tag, gender = 'lady') {
  const email = `tttest-${tag}-${stamp}@clubcheeky.test`;
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
  'Tiki Taskbar state (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!URL || !SERVICE_KEY || !ANON_KEY)
      return t.skip('Supabase env missing');

    const admin = createClient(URL, SERVICE_KEY);
    const anon = createClient(URL, ANON_KEY);
    const stamp = Date.now();
    const userIds = [];
    const convIds = [];

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
        await chunkIn('users', 'id', userIds); // Stripe-sync row — NO ACTION FK
        await chunkIn('daily_checkins', 'user_id', userIds);
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

    await t.test('fresh member: tier + zero usage, not checked in', async () => {
      const a = await makeUser(admin, anon, stamp, 'fresh');
      userIds.push(a.id);

      const { data, error } = await rpc(a.token, 'taskbar_state', {});
      assert.ok(!error, error?.message);
      const row = data[0];
      // current_tier calls the free floor 'standard' (silver is the floor
      // slug); rankForTier maps it to rank 0 / silver caps in the API.
      assert.equal(row.tier, 'standard');
      assert.equal(row.messages_sent_today, 0);
      assert.equal(row.new_people_today, 0);
      assert.equal(row.checked_in_today, false);
    });

    await t.test('check-in flips the flag; messages move the usage counts', async () => {
      const a = await makeUser(admin, anon, stamp, 'usagea', 'lady');
      const b = await makeUser(admin, anon, stamp, 'usageb', 'gentleman');
      userIds.push(a.id, b.id);

      await rpc(a.token, 'record_checkin', {});
      const { data: afterCheck } = await rpc(a.token, 'taskbar_state', {});
      assert.equal(afterCheck[0].checked_in_today, true, 'check-in flips flag');

      // B opens a conversation and sends; A reads it — unread goes away.
      const { data: conv, error: cErr } = await rpc(
        b.token,
        'get_or_create_conversation',
        { p_other: a.id }
      );
      assert.ok(!cErr, cErr?.message);
      convIds.push(conv);
      const { error: sErr } = await rpc(b.token, 'send_message', {
        p_conversation_id: conv,
        p_body: 'hello from the live test'
      });
      assert.ok(!sErr, sErr?.message);

      const { data: beforeRead } = await rpc(a.token, 'taskbar_state', {});
      assert.equal(beforeRead[0].messages_sent_today, 0, 'A sent nothing yet');

      const { data: unread } = await admin
        .from('messages')
        .select('id')
        .eq('conversation_id', conv)
        .neq('sender_id', a.id)
        .is('read_at', null);
      assert.equal(unread.length, 1, 'B\'s message is unread for A');

      const { error: markErr } = await rpc(a.token, 'mark_conversation_read', {
        p_conversation_id: conv
      });
      assert.ok(!markErr, markErr?.message);
      const { data: afterRead } = await admin
        .from('messages')
        .select('read_at')
        .eq('conversation_id', conv)
        .neq('sender_id', a.id)
        .single();
      assert.ok(afterRead.read_at, 'thread open clears unread');

      // A sends one: both usage counts move.
      const { error: aErr } = await rpc(a.token, 'send_message', {
        p_conversation_id: conv,
        p_body: 'and I reply'
      });
      assert.ok(!aErr, aErr?.message);
      const { data: afterSend } = await rpc(a.token, 'taskbar_state', {});
      assert.equal(afterSend[0].messages_sent_today, 1);
      assert.equal(afterSend[0].new_people_today, 1, 'B counts as a new person');
    });
  }
);
