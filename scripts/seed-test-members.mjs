// Seeds the test members (dummy profiles) that populate L³ trios, Matchmaker
// boards, and the Spark List for the owner's walkthroughs.
//
//   node scripts/seed-test-members.mjs                   # create the dummies
//   node scripts/seed-test-members.mjs --owner=EMAIL     # ...and flag your account
//   node scripts/seed-test-members.mjs --flag-only=EMAIL # just flag (already seeded)
//   node scripts/seed-test-members.mjs --remove          # delete all dummies
//
// Photos come from dummy_images/ at the repo root (a.png, b.png, ... up to v).
// Every image is normalized to WebP at upload (auto-orient, 1200px cap, q80 —
// the same pipeline as member uploads). Test members are invisible to real
// members — the profiles RLS policy shows them only to test-flagged callers
// (see 20260807010000_test_members.sql + 20260808040000_test_member_visibility.sql).
import { config } from 'dotenv';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

config({ path: 'env.new' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!URL || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from env.new');
  process.exit(1);
}

const sb = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PHOTO_DIR = join(process.cwd(), 'dummy_images');
const EMAIL_DOMAIN = 'clubcheeky.test';

// 22 dummies, A..V. Half gentlemen, half ladies, all open to everyone, all
// verified — so they populate any compatibility filter.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');
const NAMES = [
  'Alex', 'Bailey', 'Cameron', 'Drew', 'Elliot', 'Frankie', 'Grey', 'Harper',
  'Ivy', 'Jules', 'Kai', 'Lennon', 'Marlow', 'Noah', 'Oakley', 'Parker',
  'Quinn', 'Riley', 'Sage', 'Tatum', 'Vale', 'Winter'
];
const BIOS = [
  'Here for the floor, not the facade.',
  'Ask me about the rooftop.',
  'Dance floor at :00 — you know where to find me.',
  'Collector of good conversations.',
  'Weekend regular. Velvet rope optional.',
  'Just here for the vibe and the drinks.',
  'One song is all it takes.',
  'Slow to like, quick to laugh.',
  'The DJ knows my order.',
  'Looking for someone to split the cocktail with.',
  'Night person. The later, the better.'
];

// Normalize to WebP — auto-orient, 1200px cap, q80 (matches member uploads).
async function toWebP(img) {
  return sharp(img)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

async function seed() {
  const photos = (await readdir(PHOTO_DIR))
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (photos.length < LETTERS.length) {
    console.error(`Need ${LETTERS.length} images in dummy_images/ (a → v); found ${photos.length}`);
    process.exit(1);
  }

  for (let i = 0; i < LETTERS.length; i++) {
    const letter = LETTERS[i];
    const email = `dummy.${letter.toLowerCase()}@${EMAIL_DOMAIN}`;
    const name = NAMES[i];
    const gender = i % 2 === 0 ? 'lady' : 'gentleman';

    const { data: created, error: userErr } = await sb.auth.admin.createUser({
      email,
      password: `DummyTest${letter}!`,
      email_confirm: true,
      user_metadata: { gender, interested_in: 'everyone' }
    });
    if (userErr) {
      console.error(`  ${letter} ${email}: ${userErr.message}`);
      continue;
    }
    const uid = created.user.id;

    const { error: profileErr } = await sb
      .from('profiles')
      .update({
        display_name: name,
        bio: BIOS[i % BIOS.length],
        one_liner: `Test member ${letter} — for owner walkthroughs.`,
        verified_at: new Date().toISOString(),
        test_member: true
      })
      .eq('id', uid);
    if (profileErr) {
      console.error(`  ${letter} profile: ${profileErr.message}`);
      continue;
    }

    let webp;
    try {
      webp = await toWebP(await readFile(join(PHOTO_DIR, photos[i])));
    } catch (convErr) {
      console.error(`  ${letter} image conversion failed: ${convErr.message}`);
      continue;
    }
    const storagePath = `test-members/${uid}.webp`;
    const { error: upErr } = await sb.storage
      .from('profiles')
      .upload(storagePath, webp, { contentType: 'image/webp' });
    if (upErr && !upErr.message.includes('already exists')) {
      console.error(`  ${letter} photo upload: ${upErr.message}`);
      continue;
    }

    const { error: photoErr } = await sb.from('photos').insert({
      user_id: uid,
      storage_path: storagePath,
      position: 0,
      is_primary: true
    });
    if (photoErr) {
      console.error(`  ${letter} photo row: ${photoErr.message}`);
      continue;
    }

    console.log(`  ${letter} ${email} — ${name} (${gender}) ✓`);
  }
  console.log('Done. Flag your own account with --owner=EMAIL to see the dummies.');
}

async function remove() {
  const { data: dummies, error } = await sb
    .from('profiles')
    .select('id')
    .eq('test_member', true);
  if (error) {
    console.error('list failed:', error.message);
    process.exit(1);
  }
  for (const d of dummies ?? []) {
    // Deterministic key: test-members/{id}.webp (the seed uploads one file).
    await sb.storage.from('profiles').remove([`test-members/${d.id}.webp`]);
    // The template's signup trigger creates a Stripe-sync public.users row
    // (NO ACTION FK on auth.users) — GoTrue deleteUser 500s until it's gone.
    const { error: usersErr } = await sb.from('users').delete().eq('id', d.id);
    if (usersErr) console.error(`  ${d.id} users row: ${usersErr.message}`);
    const { error: delErr } = await sb.auth.admin.deleteUser(d.id);
    if (delErr) console.error(`  ${d.id}: ${delErr.message}`);
    else console.log(`  removed ${d.id}`);
  }
  console.log('Test members removed.');
}

async function flagOwner(email) {
  // auth.users is not exposed to PostgREST — find the account via the auth
  // admin API instead.
  const { data: users, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (listErr) {
    console.error('flag failed:', listErr.message);
    process.exit(1);
  }
  const match = (users?.users ?? []).find((u) => u.email === email);
  if (!match) {
    console.log('  (email not found — check the email you passed)');
    process.exit(1);
  }
  const { error } = await sb
    .from('profiles')
    .update({ test_member: true })
    .eq('id', match.id);
  if (error) {
    console.error('flag failed:', error.message);
    process.exit(1);
  }
  const { data: ok } = await sb.from('profiles').select('id').eq('test_member', true);
  console.log('Owner flagged. Test-flagged accounts:', (ok ?? []).length);
}

const flagOnlyArg = process.argv.slice(2).find((a) => a.startsWith('--flag-only='));
const ownerArg = process.argv.slice(2).find((a) => a.startsWith('--owner='));
if (process.argv.includes('--remove')) {
  await remove();
} else if (flagOnlyArg) {
  await flagOwner(flagOnlyArg.slice('--flag-only='.length));
} else {
  await seed();
  if (ownerArg) await flagOwner(ownerArg.slice('--owner='.length));
}
