/**
 * The front-door state machine — PURE half (docs/PRD-onboarding.md).
 * consent → verify → membership → club. The funnel IS the gate: every
 * guarded entry routes unready members to exactly the step they're on,
 * so nobody ever sees a door they can't walk through.
 */

export type OnboardingStep = 'consent' | 'verify' | 'membership' | 'club';

export function onboardingStep(input: {
  consentsComplete: boolean;
  verified: boolean;
  hasMembership: boolean;
}): OnboardingStep {
  if (!input.consentsComplete) return 'consent';
  if (!input.verified) return 'verify';
  if (!input.hasMembership) return 'membership';
  return 'club';
}

/** Where the step sends the member. 'club' = no redirect. */
export const STEP_ROUTE: Record<Exclude<OnboardingStep, 'club'>, string> = {
  consent: '/verify',
  verify: '/verify',
  membership: 'https://smartscott.square.site/collections/memberships'
};
