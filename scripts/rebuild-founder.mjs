// Rebuilds the founder's account on a freshly-migrated database:
//   auth user + profile (Boss, gentleman) + owner_accounts + permanent
//   Diamond grant + verified_at (velvet rope down).
//
// Usage: node scripts/rebuild-founder.mjs [email] [password]
//   (defaults: s.slater@smartscott.com + a generated password printed once)
import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase URL / service key missing from .env.local');
  process.exit(1);
}

const email = process.argv[2] ?? 's.slater@smartscott.com';
const password =
  process.argv[3] ??
  randomBytes(12).toString('base64url').slice(0, 16) +
    '!' +
    randomBytes(3).toString('base64url');

const sb = createClient(url, key);

async function main() {
  // 1) Auth user (the after-insert trigger creates the profile).
  let userId;
  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 200 });
  const found = (existing?.users ?? []).find((u) => u.email === email);
  if (found) {
    userId = found.id;
    console.log('User exists:', email, '->', userId);
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        gender: 'gentleman',
        interested_in: 'everyone',
        display_name: 'Boss'
      }
    });
    if (error) throw new Error('createUser: ' + error.message);
    userId = data.user.id;
    console.log('User created:', email, '->', userId);
    console.log('TEMP PASSWORD:', password, '(change it after first sign-in)');
  }

  // 2) Profile: the trigger seeds gender/preference; set the rest.
  const { error: upErr } = await sb
    .from('profiles')
    .update({
      display_name: 'Boss',
      verified_at: new Date().toISOString(),
      one_liner: 'The owner. Built this place.'
    })
    .eq('id', userId);
  if (upErr) console.log('profile update:', upErr.message, '(columns may vary)');

  // 3) Owner back door.
  const { error: oErr } = await sb
    .from('owner_accounts')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
  if (oErr) throw new Error('owner_accounts: ' + oErr.message);

  // 4) Permanent Diamond grant (no unique key on user_id — clear + insert).
  const { error: dErr } = await sb
    .from('entitlement_grants')
    .delete()
    .eq('user_id', userId)
    .eq('tier', 'diamond');
  if (dErr) throw new Error('grant clear: ' + dErr.message);
  const { error: gErr } = await sb.from('entitlement_grants').insert({
    user_id: userId,
    tier: 'diamond',
    reason: 'owner',
    expires_at: '2126-07-10T00:00:00Z'
  });
  if (gErr) throw new Error('entitlement_grants: ' + gErr.message);

  console.log('Founder account ready: Boss (diamond, owner, verified).');
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
