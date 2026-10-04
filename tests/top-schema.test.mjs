// THE TOP geometry tests (safe — pure logic, no network, no clock).
// The polytope of the member document: what may exist, and where.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMasterEntry,
  emptyManifest,
  profileToSection,
  projectFields,
  resolveSubaddress,
  trimEvents,
  trimMatches,
  membershipToSection,
  upgradeV0,
  validateManifest,
  validateSection
} from '../utils/top-schema.ts';

const U = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const V = '11111111-2222-3333-4444-555555555555';
const DAY = 86_400_000;
const NOW = Date.parse('2026-10-03T12:00:00Z');
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

const validProfile = {
  displayName: 'Scott',
  oneLiner: 'Let us make some mischief!',
  bio: 'Inventor at the intersection of the unknown.',
  gender: 'male',
  interestedIn: 'female',
  hobbies: ['hiking', 'fpga'],
  photos: [{ path: 'u/primary.webp', primary: true }],
  showAge: true,
  showHeight: false,
  showLocation: true,
  age: 41,
  height: null,
  location: 'Nashville'
};

void test('a bare v1 document with no sections is legal (sections fill as we go)', () => {
  const m = emptyManifest(U, iso(0));
  assert.equal(validateManifest(m, U).ok, true);
});

void test('the uuid cross-check: a document for another member is rejected', () => {
  const m = { ...emptyManifest(U, iso(0)) };
  const r = validateManifest(m, V);
  assert.equal(r.ok, false);
  assert.match(r.error, /userId mismatch/);
});

void test('v0 avatar contract upgrades into v1 model (+ displayBadge into assets)', () => {
  const v0 = {
    version: 0,
    userId: U,
    updatedAt: iso(1),
    name: 'Violet',
    model: { url: 'https://x/v.glb', rig: 'mixamo' },
    segments: { hair: 'h1', accessories: ['a1', 'a2'] },
    palette: { skin: '#f1c3a5' },
    stage: 'magenta-cyan-cinematic-studio-2k',
    card: { snapshotUrl: 'https://x/s.png', displayBadge: 'chat_50' }
  };
  const r = validateManifest(v0, U);
  assert.equal(r.ok, true);
  assert.deepEqual(r.manifest.sections.sort(), ['assets', 'model']);
  assert.equal(r.manifest.model.url, 'https://x/v.glb');
  assert.equal(r.manifest.assets.displayBadge, 'chat_50');
  // upgradeV0 standalone shape
  const up = upgradeV0(v0);
  assert.equal(up.rig, 'mixamo');
  assert.equal(up.snapshotUrl, 'https://x/s.png');
});

void test('profile geometry: age gate at 18, bio and one-liner bounds', () => {
  assert.equal(validateSection('profile', validProfile).ok, true);
  assert.equal(
    validateSection('profile', { ...validProfile, age: 17 }).ok,
    false
  );
  assert.equal(
    validateSection('profile', { ...validProfile, age: 18 }).ok,
    true
  );
  assert.equal(
    validateSection('profile', { ...validProfile, bio: 'x'.repeat(2001) }).ok,
    false
  );
  assert.equal(
    validateSection('profile', { ...validProfile, oneLiner: 'x'.repeat(141) })
      .ok,
    false
  );
});

void test('membership geometry: only the four floors exist', () => {
  const base = {
    tier: 'gold',
    verified: true,
    verifiedAt: iso(2),
    since: iso(30),
    guestPassUntil: null
  };
  assert.equal(validateSection('membership', base).ok, true);
  assert.equal(
    validateSection('membership', { ...base, tier: 'bronze' }).ok,
    false
  );
});

void test('matches trim: 30-day window AND the 60 cap (2/day doctrine)', () => {
  const mk = (daysAgo, i) => ({
    with: V,
    withName: `f${i}`,
    at: iso(daysAgo),
    channel: 'lounge'
  });
  const history = Array.from({ length: 80 }, (_, i) => mk(i % 40, i));
  const trimmed = trimMatches(history, NOW);
  assert.ok(
    trimmed.every((e) => NOW - Date.parse(e.at) <= 30 * DAY),
    'nothing older than 30d'
  );
  assert.ok(trimmed.length <= 60, 'capped at 60');
  // newest first
  assert.ok(Date.parse(trimmed[0].at) >= Date.parse(trimmed[1].at));
});

void test('events trim: 30-day window holds', () => {
  const ev = (daysAgo) => ({
    kind: 'dance_floor',
    at: iso(daysAgo),
    result: 'matched',
    spent: 3
  });
  const trimmed = trimEvents([ev(1), ev(29), ev(31), ev(45)], NOW);
  assert.equal(trimmed.length, 2);
});

void test('sub-addresses resolve one level deep, nothing invented', () => {
  const m = emptyManifest(U, iso(0));
  m.sections.push('profile');
  m.profile = validProfile;
  assert.deepEqual(resolveSubaddress(m, 'profile.displayName'), {
    found: true,
    value: 'Scott'
  });
  assert.equal(resolveSubaddress(m, 'profile.location').found, true);
  assert.equal(resolveSubaddress(m, 'profile.nonexistent').found, false);
  assert.equal(resolveSubaddress(m, 'membership.tier').found, false); // section absent
  assert.equal(resolveSubaddress(m, 'notasection.x').found, false);
  const proj = projectFields(m, ['profile.displayName', 'profile.showAge']);
  assert.deepEqual(proj, {
    'profile.displayName': 'Scott',
    'profile.showAge': true
  });
});

void test('match channel vocabulary is the club, not the world', () => {
  const entry = { with: V, withName: 'x', at: iso(0), channel: 'email' };
  const m = { windowDays: 30, cap: 60, history: [entry] };
  assert.equal(validateSection('matches', m).ok, false);
});

void test('master directory entry: hasAvatar only with a real model url', () => {
  const m = emptyManifest(U, iso(0));
  assert.equal(buildMasterEntry(m).hasAvatar, false);
  m.sections.push('model');
  m.model = {
    name: 'V',
    url: 'https://x/v.glb',
    rig: 'mixamo',
    segments: {},
    palette: {},
    stage: null,
    snapshotUrl: null
  };
  const e = buildMasterEntry(m);
  assert.equal(e.hasAvatar, true);
  assert.equal(e.path, `${U}/manifest.json`);
  assert.deepEqual(e.sections, ['model']);
});

void test('palette is hex or nothing', () => {
  const base = {
    name: 'V',
    url: 'https://x/v.glb',
    rig: 'mixamo',
    segments: {},
    palette: {},
    stage: null,
    snapshotUrl: null
  };
  assert.equal(
    validateSection('model', { ...base, palette: { skin: '#f1c3a5' } }).ok,
    true
  );
  assert.equal(
    validateSection('model', { ...base, palette: { skin: 'tan' } }).ok,
    false
  );
});

void test('profileToSection: table rows → legal manifest section', () => {
  const section = profileToSection(
    {
      display_name: 'Scott',
      one_liner: 'mischief',
      bio: 'inventor',
      gender: 'gentleman',
      interested_in: 'everyone',
      hobbies: ['hiking']
    },
    [
      { storage_path: 'u/b.webp', is_primary: null },
      { storage_path: 'u/a.webp', is_primary: true }
    ]
  );
  assert.equal(validateSection('profile', section).ok, true);
  assert.equal(section.displayName, 'Scott');
  assert.equal(
    section.photos[0].path,
    'u/a.webp',
    'primary kept first as given'
  );
  assert.equal(section.showAge, false, 'privacy defaults off');
  assert.equal(section.age, null, 'no invented age');
});

void test('profileToSection: null name → Member; pathless dropped; first becomes primary', () => {
  const section = profileToSection(
    {
      display_name: null,
      one_liner: null,
      bio: null,
      gender: null,
      interested_in: null,
      hobbies: null
    },
    [
      { storage_path: null, is_primary: null },
      { storage_path: 'u/only.webp', is_primary: null }
    ]
  );
  assert.equal(section.displayName, 'Member');
  assert.equal(section.photos.length, 1, 'pathless row dropped');
  assert.equal(section.photos[0].primary, true, 'first survivor is primary');
});

void test('membershipToSection: standard→silver, unknown→silver, verified from date', () => {
  const std = membershipToSection({
    tier: 'standard',
    verifiedAt: iso(1),
    since: iso(30),
    guestPassUntil: null
  });
  assert.equal(std.tier, 'silver');
  assert.equal(std.verified, true);
  const wild = membershipToSection({
    tier: 'platinum-celestial',
    verifiedAt: null,
    since: iso(2),
    guestPassUntil: null
  });
  assert.equal(
    wild.tier,
    'silver',
    'unrecognized floors fall to the door tier'
  );
  assert.equal(wild.verified, false);
  const dia = membershipToSection({
    tier: 'diamond',
    verifiedAt: iso(1),
    since: iso(60),
    guestPassUntil: iso(-1)
  });
  assert.equal(dia.tier, 'diamond');
  assert.equal(
    dia.guestPassUntil,
    iso(-1),
    'future pass expiry passes through'
  );
  assert.equal(
    validateSection('membership', std).ok,
    true,
    'output is a legal section'
  );
});
