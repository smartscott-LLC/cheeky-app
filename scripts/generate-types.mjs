// Regenerates types_db.ts from the HOSTED database — there is no local
// Supabase; everything targets hosted. Mirrors migrate-hosted.mjs.
//
// Usage: pnpm supabase:generate-types
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING not found in .env.local');
  process.exit(1);
}

const cli =
  process.platform === 'win32'
    ? 'node_modules/.bin/supabase.cmd'
    : 'node_modules/.bin/supabase';

const res = spawnSync(
  cli,
  ['gen', 'types', 'typescript', '--db-url', url, '--schema', 'public'],
  { encoding: 'utf8' }
);

if (res.status !== 0) {
  console.error(res.stderr || res.stdout || `supabase gen types exited ${res.status}`);
  process.exit(1);
}

writeFileSync('types_db.ts', res.stdout);
console.log('types_db.ts regenerated from hosted DB');
