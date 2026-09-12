import { config } from 'dotenv';

export async function register() {
  // Load .env.new as the sole env file — no .env or .env.local.
  // Uses import.meta.url (no Node.js module import) so Turbopack
  // doesn't flag an Edge Runtime warning.
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = __filename.split('/').slice(0, -1).join('/');
  config({ path: `${__dirname}/../.env.new` });
}
