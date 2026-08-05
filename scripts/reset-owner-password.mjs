// Resets the founder's password (the owner account). Usage:
//   node scripts/reset-owner-password.mjs [newPassword]
// Finds the owner via owner_accounts, sets a fresh password, prints it once.
import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

config({ path: 'env.new' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase URL / service key missing from env.new');
  process.exit(1);
}

const sb = createClient(url, key);
const newPassword = process.argv[2] ?? `${randomBytes(12).toString('base64url')}!A7`;

async function main() {
  const { data: owners } = await sb.from('owner_accounts').select('user_id');
  if (!owners?.length) {
    console.error('No owner account found in owner_accounts.');
    process.exit(1);
  }
  const { data: user, error } = await sb.auth.admin.getUserById(owners[0].user_id);
  if (error || !user?.user) throw new Error('getUserById: ' + error?.message);
  const { error: upErr } = await sb.auth.admin.updateUserById(user.user.id, {
    password: newPassword
  });
  if (upErr) throw new Error('updateUserById: ' + upErr.message);
  console.log('Owner account:', user.user.email);
  console.log('NEW PASSWORD: ' + newPassword);
  console.log('(change it after signing in — or run a reset with your own password arg)');
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
