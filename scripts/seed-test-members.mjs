// Seeds the test members (dummy profiles) that populate L³ trios, Matchmaker
// boards, and the Spark List for the owner's walkthroughs.
//
//   node scripts/seed-test-members.mjs                 # create the dummies
//   node scripts/seed-test-members.mjs --owner=EMAIL   # ...and flag your account
//   node scripts/seed-test-members.mjs --remove        # delete all dummies
//
// Photos come from test-photos/ at the repo root (a.png, b.png, ... up to v).
// Test members are invisible to real members — spark RPCs show them only to
// callers who are also test-flagged (see 20260807010000_test_members.sql).
import { config } from 'dotenv';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const PHOTO_DIR = join(process.cwd(), 'test-photos');
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

async function seed() {
  const photos = (await readdir(PHOTO_DIR))
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (photos.length < LETTERS.length) {
    console.error(`Need ${LETTERS.length} images in test-photos/ (a → v); found ${photos.length}`);
    process.exit(1);
  }

  for (let i = 0; i < LETTERS.length; i++) {
    const letter = LETTERS[i];
    const email = `dummy.${letter.toLowerCase()}@${EMAIL_DOMAIN}`;
    const name = NAMES[i];
    const gender = i % 2 === 0 ? 'lady' : 'gentleman';

    const { data: user, error: userErr } = await sb.auth.admin.createUser({
      email,
      password: `DummyTest${letter}!`,
      email_confirm: true,
      user_metadata: { gender, interested_in: 'everyone' }
    });
    if (userErr) {
      console.error(`  ${letter} ${email}: ${userErr.message}`);
      continue;
    }

    const { error: profileErr } = await sb
      .from('profiles')
      .update({
        display_name: name,
        bio: BIOS[i % BIOS.length],
        one_liner: `Test member ${letter} — for owner walkthroughs.`,
        verified_at: new Date().toISOString(),
        test_member: true
      })
      .eq('id', user.id);
    if (profileErr) {
      console.error(`  ${letter} profile: ${profileErr.message}`);
      continue;
    }

    const img = await readFile(join(PHOTO_DIR, photos[i]));
    const ext = photos[i].match(/\.(\w+)$/)?.[1] ?? 'png';
    const storagePath = `test-members/${user.id}.${ext}`;
    const { error: upErr } = await sb.storage
      .from('profiles')
      .upload(storagePath, img, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    if (upErr && !upErr.message.includes('already exists')) {
      console.error(`  ${letter} photo upload: ${upErr.message}`);
      continue;
    }

    const { error: photoErr } = await sb.from('photos').insert({
      user_id: user.id,
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
    const { error: listErr } = await sb.storage.from('profiles').list(`test-members/${d.id}`);
    for (const f of listErr ? [] : (await sb.storage.from('profiles').list(`test-members/${d.id}`)).data ?? []) {
      await sb.storage.from('profiles').remove([`test-members/${d.id}/${f.name}`]);
    }
    const { error: delErr } = await sb.auth.admin.deleteUser(d.id);
    if (delErr) console.error(`  ${d.id}: ${delErr.message}`);
    else console.log(`  removed ${d.id}`);
  }
  console.log('Test members removed.');
}

async function flagOwner(email) {
  const { data, error } = await sb
    .from('profiles')
    .update({ test_member: true })
    .eq('id', (await sb.from('auth.users').select('id').eq('email', email).maybeSingle()).data?.id ?? '');
  if (error) {
    console.error('flag failed:', error.message);
    process.exit(1);
  }
  const { data: ok } = await sb.from('profiles').select('id').eq('test_member', true);
  console.log('Owner flagged. Test-flagged accounts:', (ok ?? []).length);
  if (!data?.length) console.log('  (email not found — check the email you passed)');
}

const arg = process.argv.slice(2).find((a) => a.startsWith('--owner='));
if (process.argv.includes('--remove')) {
  await remove();
} else {
  await seed();
  if (arg) await flagOwner(arg.slice('--owner='.length));
}
