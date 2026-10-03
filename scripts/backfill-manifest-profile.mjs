#!/usr/bin/env node
/**
 * Backfill: mirror profiles + photos into every member's manifest
 * profile section (docs/PRD-user-manifest.md — the profile domino).
 *
 * Usage:
 *   node --experimental-strip-types scripts/backfill-manifest-profile.mjs
 *   node --experimental-strip-types scripts/backfill-manifest-profile.mjs --user <email-prefix>
 *
 * Merge-safe: existing manifests keep their other sections; only the
 * profile section + sections list + updatedAt change. Shares the pure
 * profileToSection mapping with the live sync (utils/top-schema.ts) —
 * one source of truth, no drift.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildMasterEntry, profileToSection } from '../utils/top-schema.ts';

config({ path: '.env.new' });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

const flagIdx = process.argv.indexOf('--user');
const emailPrefix = flagIdx > -1 ? process.argv[flagIdx + 1] : null;

let targets = null;
if (emailPrefix) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error('user list failed:', error.message);
    process.exit(1);
  }
  targets = data.users
    .filter((u) => (u.email ?? '').startsWith(emailPrefix))
    .map((u) => u.id);
  if (targets.length === 0) {
    console.error(`no user matches prefix "${emailPrefix}"`);
    process.exit(1);
  }
  console.log(`targeting ${targets.length} member(s) by email prefix`);
}

let q = admin
  .from('profiles')
  .select('id, display_name, one_liner, bio, gender, interested_in, hobbies');
if (targets) q = q.in('id', targets);
const { data: profiles, error: pErr } = await q;
if (pErr) {
  console.error('profile read failed:', pErr.message);
  process.exit(1);
}

const masterRes = await admin.storage
  .from('user-manifests')
  .download('_master.json')
  .then((r) => r.json())
  .catch(() => ({ version: 1, updatedAt: '', users: {} }));

let ok = 0,
  fail = 0,
  merged = 0;
for (const p of profiles) {
  const { data: photos } = await admin
    .from('photos')
    .select('storage_path, is_primary')
    .eq('user_id', p.id)
    .order('position', { ascending: true });

  const existing = await admin.storage
    .from('user-manifests')
    .download(`${p.id}/manifest.json`)
    .then((r) => r.json())
    .catch(() => null);

  const now = new Date().toISOString();
  const manifest =
    existing && existing.version === 1
      ? existing
      : {
          version: 1,
          userId: p.id,
          updatedAt: now,
          sections: []
        };
  manifest.profile = profileToSection(p, photos ?? []);
  if (!manifest.sections.includes('profile')) manifest.sections.push('profile');
  manifest.updatedAt = now;
  if (existing) merged++;

  const up = await admin.storage
    .from('user-manifests')
    .upload(`${p.id}/manifest.json`, manifest, {
      upsert: true,
      contentType: 'application/json'
    });
  if (up.error) {
    console.error(`  ${p.id}: ${up.error.message}`);
    fail++;
    continue;
  }
  masterRes.users[p.id] = buildMasterEntry(manifest);
  ok++;
}

masterRes.updatedAt = new Date().toISOString();
const mUp = await admin.storage
  .from('user-manifests')
  .upload('_master.json', masterRes, {
    upsert: true,
    contentType: 'application/json'
  });
if (mUp.error) {
  console.error('master write failed:', mUp.error.message);
  process.exit(1);
}
console.log(
  `backfilled ${ok}/${profiles.length} manifests (${merged} merged into existing, ${fail} failed)`
);
