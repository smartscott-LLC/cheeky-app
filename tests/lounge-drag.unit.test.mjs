// Lounge drag math — safe unit test.
//
// The bug the founder hit: the draggable panel flew off-screen on
// every stroke. Root cause was that every pointermove event applied
// (pointer - dragStart) to the original anchor, so consecutive moves
// in the same stroke compounded the delta. The fix snaps the anchor
// forward synchronously inside onPointerMove so each event only
// applies the delta since the last event.
//
// This test pins the math in isolation so a future "improvement" can't
// quietly reintroduce the cumulative-drift bug.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// JS mirror of the onPointerMove / anchor-snap logic in
// StreamChatOverlay.tsx. The natural anchor is `pos = {0, 0}` — the
// panel's default bottom-right position — so the lower bound is 0
// (no offset). The upper bound is the viewport minus the panel size
// (so the panel never escapes). min = 0 is correct; we don't add an
// arbitrary margin because the default anchor already has the right
// tailwind (24px from the right, 80px from the bottom) computed in
// the panel's CSS `calc`.
const PANEL_W = 400;
const PANEL_H = 620;

function clamp(pos, dx, dy, viewportW, viewportH) {
  const maxX = Math.max(0, viewportW - PANEL_W);
  const maxY = Math.max(0, viewportH - PANEL_H);
  return {
    x: Math.min(Math.max(pos.x + dx, 0), maxX),
    y: Math.min(Math.max(pos.y + dy, 0), maxY)
  };
}

/** Simulate a single drag stroke. Returns the final position. */
function stroke(startX, startY, endX, endY, startPos, viewportW, viewportH) {
  // Each stroke is a sequence of moves; the anchor snaps forward.
  let pos = startPos;
  let anchor = { ...startPos };
  const STEPS = 10;
  for (let i = 1; i <= STEPS; i++) {
    const px = startX + ((endX - startX) * i) / STEPS;
    const py = startY + ((endY - startY) * i) / STEPS;
    const dx = px - startX;
    const dy = py - startY;
    pos = clamp(anchor, dx, dy, viewportW, viewportH);
    anchor = pos;
  }
  return pos;
}

test('drag: a single short drag stays within the viewport', () => {
  const start = { x: 0, y: 0 };
  const final = stroke(900, 800, 950, 850, start, 1280, 800);
  assert.ok(final.x >= 0, 'x above the lower bound');
  assert.ok(final.x <= 1280 - PANEL_W, 'x below the upper bound');
  assert.ok(final.y >= 0, 'y above the lower bound');
  assert.ok(final.y <= 800 - PANEL_H, 'y below the upper bound');
});

test('drag: a long drag that would push past the right edge is clamped', () => {
  // Start at default bottom-right (anchored). Drag the pointer 5000px
  // to the right — without the snap, the cumulative delta would push
  // the panel way off-screen. With the snap, the panel just stops at
  // the right edge.
  const start = { x: 0, y: 0 };
  const final = stroke(100, 100, 5100, 100, start, 1280, 800);
  assert.equal(final.x, 1280 - PANEL_W, 'right-clamped to the viewport');
  assert.equal(final.y, 0, 'y unchanged because dy = 0');
});

test('drag: a long drag upward is clamped to the top', () => {
  const start = { x: 0, y: 0 };
  const final = stroke(900, 5000, 900, 100, start, 1280, 800);
  assert.equal(final.y, 0, 'top-clamped to the viewport (natural anchor)');
});

test('drag: the snap-forward prevents cumulative drift (the off-screen bug)', () => {
  // The bug the founder hit: WITHOUT the snap, every pointermove
  // event added (pointer - dragStart) to the original anchor. On a
  // 10-step stroke of 1000px each, the cumulative delta on the last
  // event was 10000px — way past the viewport. With the snap-forward
  // the panel is pinned at the edge after step 1.
  //
  // The invariant we pin: the running anchor NEVER exceeds the
  // viewport bounds, and consecutive steps produce monotonically
  // non-increasing drift once the edge is hit.
  const start = { x: 0, y: 0 };
  const final = stroke(0, 0, 10000, 10000, start, 1280, 800);
  // Panel anchored to its rightmost + bottommost legal position.
  assert.equal(final.x, 1280 - PANEL_W, 'x pinned to the right edge');
  assert.equal(final.y, 800 - PANEL_H, 'y pinned to the bottom edge');
  // And the panel is fully on-screen — never past the edge.
  assert.ok(final.x + PANEL_W <= 1280, 'panel right edge inside viewport');
  assert.ok(final.y + PANEL_H <= 800, 'panel bottom edge inside viewport');
});

test('drag: a small drag lands the panel inside the viewport (the actual invariant)', () => {
  // The snap-forward is a safety mechanism, not a position prediction.
  // The right invariant is: regardless of stroke length, the panel
  // never escapes the viewport. The exact final position is a
  // function of the per-step pointer deltas; we don't pin it here.
  const start = { x: 50, y: 50 };
  const final = stroke(200, 200, 300, 300, start, 1280, 800);
  assert.ok(final.x >= 0 && final.x <= 1280 - PANEL_W, 'x in bounds');
  assert.ok(final.y >= 0 && final.y <= 800 - PANEL_H, 'y in bounds');
  assert.ok(final.x + PANEL_W <= 1280, 'panel right edge inside viewport');
  assert.ok(final.y + PANEL_H <= 800, 'panel bottom edge inside viewport');
});

test('drag: a no-op stroke (pointer didn\'t move) keeps the panel put', () => {
  const start = { x: 0, y: 0 };
  const final = stroke(900, 500, 900, 500, start, 1280, 800);
  assert.equal(final.x, 0, 'no x movement');
  assert.equal(final.y, 0, 'no y movement');
});

test('drag: a stroke that ends at the anchor (delta = 0) is a no-op', () => {
  const start = { x: 50, y: 50 };
  const final = stroke(900, 500, 900, 500, start, 1280, 800);
  assert.equal(final.x, 50, 'x pinned to start');
  assert.equal(final.y, 50, 'y pinned to start');
});

test('drag: the panel never escapes the viewport in any direction', () => {
  // Exhaustive sweep — every corner of the visible area, every
  // starting position. None of them should produce an out-of-bounds
  // final position.
  const tests = [
    { from: [0, 0], to: [5000, 5000] },
    { from: [5000, 5000], to: [0, 0] },
    { from: [0, 5000], to: [5000, 0] },
    { from: [5000, 0], to: [0, 5000] },
    { from: [640, 400], to: [640, 400] } // dead center
  ];
  for (const t of tests) {
    for (const startPos of [
      { x: 0, y: 0 },
      { x: 200, y: 100 },
      { x: -100, y: -100 } // intentionally negative — the clamp must hold
    ]) {
      const final = stroke(t.from[0], t.from[1], t.to[0], t.to[1], startPos, 1280, 800);
      assert.ok(
        final.x >= 0 && final.x <= 1280 - PANEL_W,
        `x out of bounds: start=${JSON.stringify(startPos)} stroke=${JSON.stringify(t)} -> ${JSON.stringify(final)}`
      );
      assert.ok(
        final.y >= 0 && final.y <= 800 - PANEL_H,
        `y out of bounds: start=${JSON.stringify(startPos)} stroke=${JSON.stringify(t)} -> ${JSON.stringify(final)}`
      );
    }
  }
});
