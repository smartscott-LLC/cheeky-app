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

test('the bar carries every hard-capped allowance — no hourly/token-only items', () => {
  const keys = Object.keys(TASKBAR_TILES).sort();
  assert.deepEqual(keys, [
    'blind',
    'chats',
    'coat',
    'gifts',
    'l3',
    'matchmaker',
    'swipes'
  ]);
  // Hourly events are self-limiting; pure token items never appear.
  assert.ok(
    !['dance', 'speed', 'rooftop', 'tokens', 'store'].some((k) =>
      keys.includes(k)
    ),
    'hourly events and the wallet never appear'
  );
});

test('tile expansion: silver sees the spark hub + gifts; gold adds Blind Date', () => {
  const silver = tilesForRank(0).map((t) => t.key);
  assert.deepEqual(silver, ['chats', 'swipes', 'l3', 'matchmaker', 'gifts', 'coat']);
  const gold = tilesForRank(1).map((t) => t.key);
  assert.deepEqual(gold, [
    'chats',
    'swipes',
    'l3',
    'matchmaker',
    'blind',
    'gifts',
    'coat'
  ]);
  // Every tier from gold up sees the same full set (numbers vary by cap).
  assert.deepEqual(tilesForRank(3).map((t) => t.key), gold);
});

test('Matchmaker is live (un-gated) now that the dial is locked', () => {
  assert.equal(TASKBAR_TILES.matchmaker.shipped, undefined);
});

test('tier caps mirror the enforcement ladder + the plays dial + blind-date cap', () => {
  assert.deepEqual(TIER_CAPS.silver, {
    messages: 30,
    people: 5,
    plays: 2,
    blindDate: 0,
    giftsPerHour: 1
  });
  assert.deepEqual(TIER_CAPS.gold, {
    messages: 75,
    people: 15,
    plays: 3,
    blindDate: 2,
    giftsPerHour: 1
  });
  assert.deepEqual(TIER_CAPS.platinum, {
    messages: null,
    people: 40,
    plays: 4,
    blindDate: 2,
    giftsPerHour: 1
  });
  assert.deepEqual(TIER_CAPS.diamond, {
    messages: null,
    people: 100,
    plays: 5,
    blindDate: 2,
    giftsPerHour: 1
  });
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
