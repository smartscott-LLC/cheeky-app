// Smoke test for the audit #9 limiter — run from the repo root.
// Exercises bump_rate_limit against the hosted DB: budget consumed,
// cap enforced, window reset. Uses a namespaced test key so it can never
// collide with real traffic; the hourly cleanup sweeps it within a day.
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING missing');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require' });
const KEY = 'test:smoke:audit9';

const bump = (n) => sql`select public.bump_rate_limit(${KEY}, 3600, 3) as ok`;

try {
  // 1. Fresh key: first call allowed.
  let r = await bump(1);
  console.log('call 1 (fresh)  ->', r[0].ok, '(expect true)');
  // 2-3. Within budget: allowed.
  r = await bump(2);
  console.log('call 2 (1/3)    ->', r[0].ok, '(expect true)');
  r = await bump(3);
  console.log('call 3 (2/3)    ->', r[0].ok, '(expect true)');
  // 4. Cap reached: blocked.
  r = await bump(4);
  console.log('call 4 (3/3)    ->', r[0].ok, '(expect false)');
  // 5. Still capped.
  r = await bump(5);
  console.log('call 5 (over)   ->', r[0].ok, '(expect false)');

  // 6. Window reset: backdate the bucket and confirm the budget refills.
  await sql`update public.rate_limits set bucket_start = now() - interval '61 minutes' where key = ${KEY}`;
  r = await bump(6);
  console.log('call 6 (new win)->', r[0].ok, '(expect true)');

  // Cleanup: drop the test row so it never lingers.
  await sql`delete from public.rate_limits where key = ${KEY}`;
  console.log('test row cleaned up');
} catch (err) {
  console.error('SMOKE TEST FAILED:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
