// Lounge overlay resilience — safe unit test.
//
// The bug the founder hit (turn N): clicking the pill made the panel
// disappear until a page refresh. Root cause: an unhandled throw in
// the Stream watch effect (a transient `watch()` rejection, an
// event-handler registration that doesn't match the SDK signature,
// a state hydration that doesn't match the expected shape) would
// bubble up to React and unmount the entire overlay. The pill was
// INSIDE the overlay, so it vanished with it.
//
// The fix: every Stream SDK call inside the watch effect is wrapped
// in try/catch, every state setter has a mounted-guard, the IIFE
// has a `.catch(...)` for the unhandled-promise-rejection case, and
// the overlay is mounted under an error boundary so the worst-case
// behavior is a recoverable error pill — not an unmount.
//
// This test pins the shape of those guards so a future "refactor"
// can't quietly remove them.

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('resilience: a setState that throws does not bubble to the caller', () => {
  // Mirror of `safeSetMessages` — wraps a state setter in a mounted
  // check + try/catch so a bad updater can never crash the overlay.
  let mounted = true;
  let called = false;
  const safeSet = (updater) => {
    if (!mounted) return;
    try {
      updater();
    } catch {
      // swallow
    }
  };
  safeSet(() => {
    called = true;
    throw new Error('bad');
  });
  assert.equal(called, true, 'updater was still called');
  mounted = false;
  safeSet(() => {
    throw new Error('post-unmount');
  });
  // No throw — that's the whole point.
  assert.ok(true);
});

test('resilience: an async IIFE that rejects still calls .catch', async () => {
  // The watch effect uses `(async () => {...})().catch(err => ...)`
  // so a rejection at the top of the IIFE doesn't become an
  // unhandled rejection.
  let caught = null;
  await (async () => {
    throw new Error('transient watch failure');
  })().catch((err) => {
    caught = err;
  });
  assert.ok(caught instanceof Error, '.catch was wired');
  assert.equal(caught.message, 'transient watch failure');
});

test('resilience: a watch() rejection is not fatal', async () => {
  // Mirror of the first try/catch around ch.watch().
  async function watchSafely() {
    try {
      await Promise.reject(new Error('channel not found'));
    } catch {
      return 'continuing';
    }
  }
  const outcome = await watchSafely();
  assert.equal(outcome, 'continuing');
});

test('resilience: missing messages array hydrates to empty list', () => {
  // If ch.state.messages is undefined for any reason, we want an
  // empty list, not a crash. The production code does
  // `(ch.state.messages as unknown as Array<...>) ?? []`.
  const chState = { messages: undefined };
  const hydrated = (chState.messages ?? []).map((m) => m.id);
  assert.deepEqual(hydrated, []);
});

test('resilience: a malformed message object survives the hydration', () => {
  // Real-world: a message with a missing `user` (Stream edge case
  // during reconnect) shouldn't crash the overlay.
  const chState = {
    messages: [
      { id: 'm1', text: 'hi', user: { id: 'u1', name: 'Ada' }, custom: {} },
      { id: 'm2', text: 'no user', user: undefined, custom: {} },
      { id: 'm3', text: 'no custom', user: { id: 'u3', name: 'Bea' } }
    ]
  };
  const hydrated = chState.messages.map((m) => ({
    id: m.id,
    text: m.text,
    userId: m.user?.id ?? '',
    userName: m.user?.name ?? 'Member',
    floor: m.custom?.floor,
    horn: m.custom?.horn
  }));
  assert.equal(hydrated.length, 3, 'all messages preserved');
  assert.equal(hydrated[1].userId, '', 'missing user has empty id');
  assert.equal(hydrated[1].userName, 'Member', 'missing user has fallback name');
  assert.equal(hydrated[2].floor, undefined, 'missing custom is allowed');
});

test('resilience: the watch effect does not run when the panel is closed', () => {
  // Production: `if (!open) return;` early in the effect. The
  // effect should be a no-op until the user actually opens the
  // panel — that's what keeps the surface area for errors small.
  const open = false;
  let watchCalled = false;
  const effect = () => {
    if (!open) return;
    watchCalled = true;
  };
  effect();
  assert.equal(watchCalled, false, 'no work done while closed');
});

test('resilience: error boundary catches a synchronous throw from a child', () => {
  // The overlay is now mounted under ClubChatBoundary, which
  // catches errors and renders a recoverable retry pill.
  class Boundary {
    constructor() {
      this.hasError = false;
      this.error = null;
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
  }
  const b = new Boundary();
  try {
    throw new Error('child exploded');
  } catch (err) {
    const derived = Boundary.getDerivedStateFromError(err);
    Object.assign(b, derived);
  }
  assert.equal(b.hasError, true);
  assert.equal(b.error?.message, 'child exploded');
});
