#!/usr/bin/env node
/**
 * Backfill: mirror every member's live membership state into their manifest
 * (docs/PRD-user-manifest.md — the membership domino). current_tier() is the
 * authority; this script just asks it, per member, merge-safe.
 *
 * Usage:
 *   node --experimental-strip-types scripts/backfill-manifest-membership.mjs
 *   node --experimental-strip-types scripts/backfill-manifest-membership.mjs --user <email-prefix>
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildMasterEntry, membershipToSection } from '../utils/top-schema.ts';

config({ path: '.env.new' });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);
const adminKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

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

let q = admin.from('profiles').select('id, created_at, verified_at');
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
  fail = 0;
for (const p of profiles) {
  const { data: tierRow } = await admin.rpc('current_tier', { p_user: p.id });
  const { data: pass } = await admin
    .from('guest_passes')
    .select('expires_at')
    .eq('guest_id', p.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .maybeSingle();

  // Distinguish "no manifest yet" (404 → fresh skeleton) from a transient
  // failure (→ SKIP this member; never overwrite a document we couldn't read).
  const dl = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/user-manifests/${p.id}/manifest.json`,
    { headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}` } }
  );
  if (dl.status !== 404 && !dl.ok) {
    console.error(`  ${p.id}: read failed ${dl.status}, skipped`);
    fail++;
    continue;
  }
  const existing = dl.ok ? await dl.json() : null;

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
  manifest.membership = membershipToSection({
    tier: String(tierRow ?? 'silver'),
    verifiedAt: p.verified_at,
    since: p.created_at,
    guestPassUntil: pass?.expires_at ?? null
  });
  if (!manifest.sections.includes('membership'))
    manifest.sections.push('membership');
  manifest.updatedAt = now;

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
  `membership-mirrored ${ok}/${profiles.length} manifests (${fail} failed)`
);
