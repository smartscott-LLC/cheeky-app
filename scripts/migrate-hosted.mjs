// Applies supabase/migrations/*.sql to the HOSTED database via the direct
// Postgres connection in .env.local (POSTGRES_URL_NON_POOLING).
//
// Usage: node scripts/migrate-hosted.mjs [name-part]
//   (name-part filters which migration files to apply; omit = all)
//
// Dev utility — not part of the app runtime.
import { config } from 'dotenv';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

config({ path: 'env.new' });

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING not found in .env.local');
  process.exit(1);
}

const dir = join(process.cwd(), 'supabase', 'migrations');
const filter = process.argv[2] ?? '';
const files = (await readdir(dir))
  .filter((f) => f.endsWith('.sql') && f.includes(filter))
  .sort();

if (files.length === 0) {
  console.error(`No migrations match "${filter}"`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require' });

try {
  for (const file of files) {
    const body = await readFile(join(dir, file), 'utf8');
    console.log(`Applying ${file} ...`);
    await sql.unsafe(body);
    console.log('  ok');
  }

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('profiles', 'profile_private', 'consents', 'photos', 'token_ledger')
    order by table_name
  `;
  console.log(
    'Phase 1A tables present on hosted DB:',
    tables.map((t) => t.table_name).join(', ')
  );
} finally {
  await sql.end();
}
