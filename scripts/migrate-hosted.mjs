// Applies supabase/migrations/*.sql to the HOSTED database via the direct
// Postgres connection in .env.new (POSTGRES_URL_NON_POOLING).
//
// Usage: node scripts/migrate-hosted.mjs [name-part]
//   (name-part filters which migration files to apply; omit = all pending)
//
// Dev utility — not part of the app runtime.
// Skips migrations already recorded in public.supabase_migrations.
import { config } from 'dotenv';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

config({ path: '.env.new' });

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING not found in .env.new');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require' });

try {
  // Load already-applied versions from tracking table
  const applied = await sql`select version from public.supabase_migrations`;
  const appliedSet = new Set(applied.map(r => r.version));

  const dir = join(process.cwd(), 'supabase', 'migrations');
  const filter = process.argv[2] ?? '';
  const allFiles = (await readdir(dir))
    .filter((f) => f.endsWith('.sql') && f.includes(filter))
    .sort();

  if (allFiles.length === 0) {
    console.error(`No migrations match "${filter}"`);
    process.exit(1);
  }

  const pending = allFiles.filter(f => !appliedSet.has(f.split('.')[0]));
  const skipped = allFiles.filter(f => appliedSet.has(f.split('.')[0]));

  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} already-applied:`, skipped.map(f => f.split('.')[0]).join(', '));
  }

  if (pending.length === 0) {
    console.log('No pending migrations.');
    process.exit(0);
  }

  console.log(`Applying ${pending.length} migration(s)...`);

  for (const file of pending) {
    const version = file.split('.')[0];
    const body = await readFile(join(dir, file), 'utf8');
    console.log(`  Applying ${file} ...`);
    try {
      await sql.unsafe(body);
      // Record success
      await sql`
        insert into public.supabase_migrations (version, name, success)
        values (${version}, ${file.replace('.sql', '')}, true)
        on conflict (version) do update set success = true, inserted_at = now()
      `;
      console.log(`    ok`);
    } catch (err) {
      // Skip idempotent errors — table/function already exists means migration was applied
      const msg = err.message || '';
      const alreadyApplied =
        msg.includes('already exists') ||
        msg.includes('duplicate column') ||
        msg.includes('duplicate object');
      if (alreadyApplied) {
        console.log(`    skipped (already applied)`);
        await sql`
          insert into public.supabase_migrations (version, name, success)
          values (${version}, ${file.replace('.sql', '')}, true)
          on conflict (version) do update set success = true, inserted_at = now()
        `;
        continue;
      }
      console.error(`    FAILED: ${msg}`);
      await sql`
        insert into public.supabase_migrations (version, name, success)
        values (${version}, ${file.replace('.sql', '')}, false)
        on conflict (version) do update set success = false
      `;
      throw err;
    }
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
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
