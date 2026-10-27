/**
 * The beta soft-open gate (founder greenlight 2026-10-27).
 *
 * Pure predicate — no I/O. The middleware feeds it the pathname, the visitor
 * facts, and the cached launch config; it answers what happens. Every branch
 * is unit-tested (tests/launch-gate.test.mjs); the DB migration owns the
 * switch, the owner console owns the invites.
 */

export interface GateFacts {
  /** true once signed in (verified or not — the door still works in beta) */
  signedIn: boolean;
  /** profiles.early_access — founder-selected testers */
  earlyAccess: boolean;
  /** launch_config.open — the global doors switch */
  launchOpen: boolean;
}

/** Surfaces the soft-open holds back: the live club world. */
const GATED_PREFIXES = [
  '/club',
  '/floor',
  '/floors',
  '/browse',
  '/events',
  '/messages',
  '/chat',
  '/gifts',
  '/date-night'
];

/** What stays open pre-launch: the street, the door, the booth, the bank —
 *  and the crew page, which is a poster of the characters, not a room. */
const ALWAYS_OPEN_PREFIXES = [
  '/welcome',
  '/verify',
  '/signin',
  '/auth',
  '/account',
  '/coat-check',
  '/store',
  '/swag',
  '/pricing',
  '/story',
  '/api',
  '/contact',
  '/crew'
];

export type GateDecision = 'allow' | 'to-welcome' | 'to-signin';

export function gate(pathname: string, facts: GateFacts): GateDecision {
  // Explicitly-open surfaces answer before anything else.
  if (
    ALWAYS_OPEN_PREFIXES.some(
      (pre) => pathname === pre || pathname.startsWith(`${pre}/`)
    )
  )
    return 'allow';
  // The street (anything not explicitly gated) is always open.
  const gated = GATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!gated) return 'allow';
  if (facts.launchOpen || facts.earlyAccess) return 'allow';
  if (!facts.signedIn) return 'to-signin';
  return 'to-welcome';
}

/**
 * The beta banner copy — one place, both for the landing ticker and the
 * welcome page. `opensAt` comes from launch_config so the date is a flip,
 * not a deploy.
 */
export function betaBannerText(opensAt: Date): string {
  const when = opensAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  return `🚧 Beta testing in progress — sign up and check in with Brutus now, the lounge is open tonight, and the full club opens ${when}.`;
}
