import { config } from 'dotenv';
import { resolve } from 'path';

export async function register() {
  // Load .env.new as the sole env file — no .env or .env.local
  config({ path: resolve(__dirname, '../.env.new') });
}
