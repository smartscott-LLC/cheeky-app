// Tiki Taskbar config tests (safe — pure logic, no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIER_CAPS,
  TASKBAR_TILES,
  capsForTier,
  isTaskbarHidden,
  rankForTier,
  tilesForRank
} from '../utils/taskbar.ts';

test('the bar only carries hard-capped tiles — no token-spend items', () => {
  const keys = Object.keys(TASKBAR_TILES).sort();
  assert.deepEqual(keys, ['chats', 'coat', 'matchmaker', 'sparks']);
  assert.ok(
    !['dance', 'blind', 'speed', 'rooftop', 'tokens'].some((k) =>
      keys.includes(k)
    ),
    'events and tokens never appear (we do not regulate token spend)'
  );
});

test('Matchmaker stays gated until it ships', () => {
  assert.equal(TASKBAR_TILES.matchmaker.shipped, false);
  for (const rank of [0, 1, 2, 3]) {
    const keys = tilesForRank(rank).map((t) => t.key);
    assert.deepEqual(keys, ['chats', 'sparks', 'coat']);
    assert.ok(!keys.includes('matchmaker'), 'hidden until shipped flips');
  }
});

test('tier caps mirror the enforcement ladder + the plays dial', () => {
  // 30/5, 75/15, ∞/40, ∞/100 (messages/people) and Matchmaker 2/3/4/5.
  assert.deepEqual(TIER_CAPS.silver, { messages: 30, people: 5, plays: 2 });
  assert.deepEqual(TIER_CAPS.gold, { messages: 75, people: 15, plays: 3 });
  assert.deepEqual(TIER_CAPS.platinum, { messages: null, people: 40, plays: 4 });
  assert.deepEqual(TIER_CAPS.diamond, { messages: null, people: 100, plays: 5 });
});

test('rank + caps mapping is forgiving', () => {
  assert.equal(rankForTier('silver'), 0);
  assert.equal(rankForTier('diamond'), 3);
  assert.equal(rankForTier(null), 0);
  assert.equal(rankForTier('bogus'), 0);
  assert.equal(capsForTier('platinum').messages, null);
  assert.equal(capsForTier('bogus').messages, 30);
});

test('route gating hides only the street/door/office/auth — never the club', () => {
  // The regression: startsWith('/') matched every route and hid the bar
  // everywhere. '/' is exact; everything else is prefix-matched.
  assert.equal(isTaskbarHidden('/'), true, 'landing hidden');
  assert.equal(isTaskbarHidden('/signin'), true);
  assert.equal(isTaskbarHidden('/verify'), true);
  assert.equal(isTaskbarHidden('/owner'), true);
  assert.equal(isTaskbarHidden('/auth/callback'), true);
  assert.equal(isTaskbarHidden('/club'), false, 'lobby shows the bar');
  assert.equal(isTaskbarHidden('/floors/silver'), false);
  assert.equal(isTaskbarHidden('/messages'), false);
  assert.equal(isTaskbarHidden('/browse'), false);
  assert.equal(isTaskbarHidden('/events/dance_floor'), false);
});
