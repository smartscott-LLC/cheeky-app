// Keeps .env.local in sync with env.new — the founder's single source of
// truth. env.new is where every key lives (the fresh vault, after the
// integration wipe); .env.local only exists because Next.js auto-loads it
// for `pnpm dev`/`pnpm build` locally. Never hand-edit .env.local — edit
// env.new, then run this.
//
// Usage: node scripts/sync-env.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = 'env.new';
const dst = '.env.local';

try {
  const body = readFileSync(src, 'utf8');
  writeFileSync(dst, body);
  console.log(`.env.local <- ${src} (${body.trim().split('\n').length} lines)`);
} catch (err) {
  console.error(`sync-env failed: ${err.message}`);
  console.error(`(env.new is the master vault — see docs/ENVIRONMENT.md)`);
  process.exit(1);
}
