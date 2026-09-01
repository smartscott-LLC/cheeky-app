// Purge leftover Matchmaker test members (mmtest-*) after interrupted runs.
// Safe to re-run; only touches mmtest-/mmdbg- emails.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: 'env.new' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const ids = [];
let page = 1;
for (;;) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 1000
  });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const mine = data.users.filter(
    (u) => u.email.startsWith('mmtest-') || u.email.startsWith('mmdbg-')
  );
  ids.push(...mine.map((u) => u.id));
  if (data.users.length < 1000) break;
  page++;
}

console.log('found', ids.length, 'leftover test members');

const chunkIn = async (table, col, list) => {
  for (let i = 0; i < list.length; i += 100) {
    await admin.from(table).delete().in(col, list.slice(i, i + 100));
  }
};

if (ids.length) {
  await chunkIn('matchmaker_unlocks', 'sender_id', ids);
  await chunkIn('matchmaker_unlocks', 'recipient_id', ids);
  await chunkIn('matchmaker_boards', 'user_id', ids);
  await chunkIn('matches', 'user_id_a', ids);
  await chunkIn('matches', 'user_id_b', ids);
  await chunkIn('gift_inventory', 'user_id', ids);
  await chunkIn('gift_sends', 'sender_id', ids);
  await chunkIn('gift_sends', 'recipient_id', ids);
  await chunkIn('conversations', 'user_id_a', ids);
  await chunkIn('conversations', 'user_id_b', ids);
  await chunkIn('users', 'id', ids);
  await chunkIn('photos', 'user_id', ids);
  await chunkIn('likes', 'liker_id', ids);
  await chunkIn('likes', 'likee_id', ids);
  await chunkIn('l3_picks', 'picker_id', ids);
  await chunkIn('l3_picks', 'target_id', ids);

  for (let i = 0; i < ids.length; i += 25) {
    const results = await Promise.allSettled(
      ids.slice(i, i + 25).map((id) => admin.auth.admin.deleteUser(id))
    );
    let failures = 0;
    for (const r of results)
      if (r.status === 'rejected' || r.value?.error) {
        failures++;
        if (failures <= 5)
          console.error(
            'deleteUser failed:',
            r.reason?.message ?? r.value?.error?.message
          );
      }
    console.log('batch', i, 'done;', failures, 'failed');
  }
}

console.log('purge complete');
