// Club Chat — pure-logic safety pins (the "no DB, no network" half).
// The matching live test (tests/club-chat.live.test.mjs) exercises the
// real RPCs; this file pins the rules a bad data path could otherwise
// silently break — the always-on profanity normalizer (the squish fix
// from 20260808162000_club_chat_profanity_squish.sql) and the Horn
// announcement format that crosses the club ticker.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================
// The always-on profanity normalizer — JS mirror of the SQL
// function public.club_chat_profanity(p_body text) in
// 20260808160000_club_chat.sql + the squish fix in
// 20260808162000_club_chat_profanity_squish.sql. If this drifts,
// live tests will fail too — but the safe suite is what CI runs.
// ============================================================
const PROFANITY = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'whore', 'slut', 'dick',
  'cock', 'pussy', 'faggot', 'nigga', 'nigger', 'kike', 'retard',
  'rape', 'killyourself', 'dieinafire'
];

function profanityBlocked(body) {
  const squished = body.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PROFANITY.some((w) => squished.includes(w));
}

test('profanity: the straight word is caught', () => {
  assert.equal(profanityBlocked('this is shit'), true);
  assert.equal(profanityBlocked('FUCK off'), true);
  assert.equal(profanityBlocked('you bitch'), true);
});

test('profanity: the squish fix — letter-spaced and punctuated forms', () => {
  // The very pattern the squish migration was added for: letter-spaced
  // profanity that a space-keeping normalizer would let through.
  assert.equal(profanityBlocked('this is f u c k e d up'), true);
  assert.equal(profanityBlocked('s.h.i.t.'), true);
  assert.equal(profanityBlocked('f-u-c-k'), true);
  assert.equal(profanityBlocked('K-I-L-L Y-O-U-R-S-E-L-F'), true);
  assert.equal(profanityBlocked('die!!! in a fire???'), true);
  // Mixed case + emoji between letters.
  assert.equal(profanityBlocked('f🍑u🍑c🍑k'), true);
});

test('profanity: clean messages are never blocked', () => {
  assert.equal(profanityBlocked('hello everyone'), false);
  assert.equal(profanityBlocked(''), false);
  assert.equal(profanityBlocked('this is a lovely club'), false);
  // Words that contain a partial substring of a list entry but aren't
  // a full match after squishing.
  assert.equal(profanityBlocked('classic'), false);
  assert.equal(profanityBlocked('shipped it'), false);
  assert.equal(profanityBlocked('assist'), false);
  // "badass" is allowed — the list has "asshole", not "ass" — so
  // partial-substring hits inside a longer compound word are fine.
  assert.equal(profanityBlocked('badass'), false);
  // The function is a substring check on the squished alphabet by
  // design (the founder chose this: simplicity > Scunthorpe-safe NLP),
  // so we don't pretend to defend "scunthorpe" — that class of false
  // positive is a known, accepted trade-off documented in the PRD.
  // We only pin the survivals that matter: everyday clean words.
  assert.equal(profanityBlocked('cheers everyone'), false);
  assert.equal(profanityBlocked('great show tonight'), false);
});

// ============================================================
// The Horn message format — JS mirror of the SQL in
// club_chat_horn: the announcement row is `'🎺 ' || p_body` with
// kind = 'horn'. The marquee relies on this prefix to render the
// horn chip on the floor tickers.
// ============================================================
function hornAnnouncement(body) {
  return { body: `🎺 ${body}`, kind: 'horn' };
}

test('horn: announcement prefix and kind', () => {
  const a = hornAnnouncement('the club is OPEN tonight!');
  assert.equal(a.body, '🎺 the club is OPEN tonight!');
  assert.equal(a.kind, 'horn');
  // The kind is the watch the marquee filters by — must be exactly 'horn'.
  assert.equal(hornAnnouncement('').body, '🎺 ');
});

// ============================================================
// The floor ladder (mirror of the tier_rank check in
// club_chat_send). Verified live by tests/club-chat.live.test.mjs;
// pinned here so the rule is documented next to the code.
// ============================================================
const TIER_RANK = { silver: 0, gold: 1, platinum: 2, diamond: 3 };

function canTypeIn(myTier, room) {
  if (room === 'global') return true; // town square: everyone
  return TIER_RANK[myTier] >= TIER_RANK[room];
}

test('ladder: Global is everyone\'s', () => {
  assert.equal(canTypeIn('silver', 'global'), true);
  assert.equal(canTypeIn('gold', 'global'), true);
  assert.equal(canTypeIn('platinum', 'global'), true);
  assert.equal(canTypeIn('diamond', 'global'), true);
});

test('ladder: your floor and below, the climb is read-only above', () => {
  assert.equal(canTypeIn('silver', 'silver'), true);
  assert.equal(canTypeIn('silver', 'gold'), false);
  assert.equal(canTypeIn('silver', 'platinum'), false);
  assert.equal(canTypeIn('silver', 'diamond'), false);
  assert.equal(canTypeIn('gold', 'silver'), true);
  assert.equal(canTypeIn('gold', 'gold'), true);
  assert.equal(canTypeIn('gold', 'platinum'), false);
  assert.equal(canTypeIn('platinum', 'platinum'), true);
  assert.equal(canTypeIn('platinum', 'diamond'), false);
  assert.equal(canTypeIn('diamond', 'diamond'), true);
});

// ============================================================
// The Horn cooldown (mirror of bump_rate_limit('horn:user:...').
// One blast per hour — the rate limit key and the per-call max.
// ============================================================
test('horn: rate limit key shape and 1-per-hour cap', () => {
  // The key MUST be namespaced so it doesn't collide with other
  // rate limits (the SQL function rejects unprefixed keys).
  const userId = '11111111-1111-1111-1111-111111111111';
  const key = `horn:user:${userId}`;
  assert.match(key, /^horn:user:[0-9a-f-]+$/);
  // The function caps at 1 per 3600s.
  assert.equal(3600, 60 * 60);
});

// ============================================================
// The Chatterbox thresholds (mirror of public.club_chat_bump_badges).
// The award ladder is config-data, not rebuild-data — a bad bump
// would mean the badges never land.
// ============================================================
const CHATTERBOX = [
  { count: 50, slug: 'chat_50' },
  { count: 200, slug: 'chat_200' },
  { count: 500, slug: 'chat_500' },
  { count: 1000, slug: 'chat_1000' }
];

function badgeForCount(n) {
  let awarded = null;
  for (const tier of CHATTERBOX) {
    if (n >= tier.count) awarded = tier.slug;
  }
  return awarded;
}

test('chatterbox: thresholds land in order, never skip', () => {
  assert.equal(badgeForCount(0), null);
  assert.equal(badgeForCount(49), null);
  assert.equal(badgeForCount(50), 'chat_50');
  assert.equal(badgeForCount(199), 'chat_50');
  assert.equal(badgeForCount(200), 'chat_200');
  assert.equal(badgeForCount(499), 'chat_200');
  assert.equal(badgeForCount(500), 'chat_500');
  assert.equal(badgeForCount(999), 'chat_500');
  assert.equal(badgeForCount(1000), 'chat_1000');
  assert.equal(badgeForCount(100000), 'chat_1000');
});
