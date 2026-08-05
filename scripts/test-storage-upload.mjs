// Dev utility: tests a storage upload to the HOSTED bucket with the
// service-role key (bypasses RLS — isolates storage API vs auth issues).
// Usage: node scripts/test-storage-upload.mjs
import { readFile } from 'node:fs/promises';

const env = await readFile('/tmp/vercel-env.txt', 'utf8');
const get = (k) =>
  env
    .split('\n')
    .find((l) => l.startsWith(`${k}=`))
    ?.split('=')[1]
    .replace(/^"|"$/g, '');

const url = get('SUPABASE_URL');
const key = get('SUPABASE_SERVICE_ROLE_KEY');
const body = 'storage api test';

const res = await fetch(`${url}/storage/v1/object/profiles/_admin-test.txt`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': 'text/plain'
  },
  body
});

console.log('status:', res.status);
console.log('body:', await res.text());

// cleanup
await fetch(`${url}/storage/v1/object/profiles/_admin-test.txt`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${key}`, apikey: key }
});
