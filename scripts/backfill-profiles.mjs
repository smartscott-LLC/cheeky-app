// One-time backfill: creates profiles/profile_private rows for auth users
// that predate the Phase 1A trigger (new signups get rows automatically).
// Usage: node scripts/backfill-profiles.mjs
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: 'env.new' });

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING not found in .env.local');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require' });

try {
  // Backfill public.users for every auth user (the trigger only fires on
  // new signups).
  const missingUsers = await sql`
    select id
    from auth.users
    where id not in (select id from public.users)
  `;
  if (missingUsers.length > 0) {
    for (const { id } of missingUsers) {
      await sql`
        insert into public.users (id) values (${id})
        on conflict (id) do nothing
      `;
    }
    console.log(`Backfilled ${missingUsers.length} user row(s).`);
  }

  const missing = await sql`
    select id
    from auth.users
    where id not in (select id from public.profiles)
  `;

  if (missing.length === 0) {
    console.log('No profiles need backfill.');
  } else {
    console.log(`Backfilling ${missing.length} profile(s)...`);
    for (const { id } of missing) {
      await sql`
        insert into public.profiles (id) values (${id})
        on conflict (id) do nothing
      `;
      await sql`
        insert into public.profile_private (id) values (${id})
        on conflict (id) do nothing
      `;
    }
    console.log('Profile backfill complete.');
  }
} finally {
  await sql.end();
}
