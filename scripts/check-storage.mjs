// Dev utility: checks hosted storage bucket + policies + photo rows.
// Usage: node scripts/check-storage.mjs
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  max: 1,
  ssl: 'require'
});

try {
  const buckets = await sql`
    select id, name, public from storage.buckets where id = 'profiles'
  `;
  console.log('bucket:', JSON.stringify(buckets));

  const objects = await sql`
    select count(*)::int as n from storage.objects where bucket_id = 'profiles'
  `;
  console.log('objects in profiles bucket:', objects[0].n);

  const photos = await sql`
    select count(*)::int as n from public.photos
  `;
  console.log('photo rows:', photos[0].n);

  const policies = await sql`
    select policyname, cmd from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    order by cmd
  `;
  console.log('storage policies:', JSON.stringify(policies));
} finally {
  await sql.end();
}
