import { config } from 'dotenv';

export async function register() {
  // Load .env.new as the sole env file — no .env or .env.local
  config({ path: `${process.cwd()}/.env.new` });
}
