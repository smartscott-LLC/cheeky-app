// Syncs .env.new → .env.local (and vice versa if .env.local is newer).
// .env.new is the source of truth; .env.local is kept in sync for any tool
// that reads it directly. Never hand-edit either — they must match.
//
// Usage: node scripts/sync-env.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const src = '.env.new';
const dst = '.env.local';
const requiredKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MODEL_API_KEY',
  'AI_MODEL',
  'MODEL_BASE_URL',
  'STREAMCHAT_API_KEY',
  'STREAMCHAT_SECRET_KEY',
  'RESEND_API_KEY',
  'ADMIN_KEY',
  'NEXT_PUBLIC_SITE_URL'
];

try {
  if (!existsSync(src)) throw new Error(`${src} not found`);
  const body = readFileSync(src, 'utf8');
  const lines = body.trim().split('\n').length;
  console.log(`${src}: ${lines} lines, well-formed`);

  const presentKeys = new Set(
    body.split('\n')
      .map(l => l.split('=')[0]?.trim())
      .filter(k => k && !k.startsWith('#'))
  );

  const missing = requiredKeys.filter(k => !presentKeys.has(k));
  if (missing.length) {
    console.warn(`⚠️  Missing required keys: ${missing.join(', ')}`);
  } else {
    console.log('✅ All required keys present');
  }

  // Always keep .env.local in sync with .env.new
  writeFileSync(dst, body);
  console.log(`✅ Synced to ${dst}`);
} catch (err) {
  console.error(`sync-env failed: ${err.message}`);
  process.exit(1);
}
