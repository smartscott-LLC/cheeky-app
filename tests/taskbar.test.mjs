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

void test('the bar carries every hard-capped allowance — no hourly/token-only items', () => {
  const keys = Object.keys(TASKBAR_TILES).sort();
  assert.deepEqual(keys, [
    'blind',
    'chats',
    'coat',
    'dance',
    'dateNight',
    'gifts',
    'icebreakers',
    'l3',
    'matchmaker',
    'rooftop',
    'speed',
    'swipes'
  ]);
  // Hourly events are self-limiting; pure token items never appear.
  assert.ok(
    !['tokens', 'store'].some((k) =>
      keys.includes(k)
    ),
    'the wallet and store never appear'
  );
});

void test('tile expansion: silver sees the spark hub + gifts; gold adds Blind Date + Dance Floor', () => {
  const silver = tilesForRank(0).map((t) => t.key);
  assert.deepEqual(silver, [
    'chats',
    'swipes',
    'l3',
    'matchmaker',
    'dance',
    'gifts',
    'icebreakers',
    'dateNight',
    'coat'
  ]);
  const gold = tilesForRank(1).map((t) => t.key);
  assert.deepEqual(gold, [
    'chats',
    'swipes',
    'l3',
    'matchmaker',
    'blind',
    'dance',
    'gifts',
    'icebreakers',
    'dateNight',
    'coat'
  ]);
  const platinum = tilesForRank(2).map((t) => t.key);
  assert.deepEqual(platinum, [
    'chats',
    'swipes',
    'l3',
    'matchmaker',
    'blind',
    'dance',
    'speed',
    'gifts',
    'icebreakers',
    'dateNight',
    'coat'
  ]);
  const diamond = tilesForRank(3).map((t) => t.key);
  assert.deepEqual(diamond, [
    'chats',
    'swipes',
    'l3',
    'matchmaker',
    'blind',
    'dance',
    'speed',
    'rooftop',
    'gifts',
    'icebreakers',
    'dateNight',
    'coat'
  ]);
});

void test('Matchmaker is live (un-gated) now that the dial is locked', () => {
  assert.equal(TASKBAR_TILES.matchmaker.shipped, undefined);
});

void test('tier caps mirror the enforcement ladder + free event allowances', () => {
  assert.deepEqual(TIER_CAPS.silver, {
    messages: 30,
    people: 5,
    l3: 4,
    plays: 3,
    blindDate: 0,
    giftsPer15min: 4,
    icebreakers: 5,
    danceFree: 1,
    speedFree: 0,
    rooftopFree: 0,
    blindFree: 1
  });
  assert.deepEqual(TIER_CAPS.gold, {
    messages: 75,
    people: 15,
    l3: 8,
    plays: 5,
    blindDate: 2,
    giftsPer15min: 4,
    icebreakers: 10,
    danceFree: 1,
    speedFree: 0,
    rooftopFree: 0,
    blindFree: 1
  });
  assert.deepEqual(TIER_CAPS.platinum, {
    messages: null,
    people: 40,
    l3: 12,
    plays: 8,
    blindDate: 2,
    giftsPer15min: 4,
    icebreakers: null,
    danceFree: 1,
    speedFree: 1,
    rooftopFree: 0,
    blindFree: 2
  });
  assert.deepEqual(TIER_CAPS.diamond, {
    messages: null,
    people: 100,
    l3: 20,
    plays: 12,
    blindDate: 2,
    giftsPer15min: 4,
    icebreakers: null,
    danceFree: 1,
    speedFree: 2,
    rooftopFree: 1,
    blindFree: 2
  });
});

void test('rank + caps mapping is forgiving', () => {
  assert.equal(rankForTier('silver'), 0);
  assert.equal(rankForTier('diamond'), 3);
  assert.equal(rankForTier(null), 0);
  assert.equal(rankForTier('bogus'), 0);
  assert.equal(capsForTier('platinum').messages, null);
  assert.equal(capsForTier('bogus').messages, 30);
});

void test('route gating hides only the street/door/office/auth — never the club', () => {
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
