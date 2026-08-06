// Membership token grants (PRD-event-logic §7): every paid membership comes
// with tokens, every cycle — Gold 100, Platinum 200, Diamond 500. Pure
// mappings, unit-tested; the webhook applies them via the token ledger
// (idempotent per subscription + period + tier).

export interface MembershipGrant {
  amount: number;
  reason: string;
}

const GRANTS: Record<string, MembershipGrant> = {
  'Gold Membership': { amount: 100, reason: 'membership_gold' },
  'Platinum Membership': { amount: 200, reason: 'membership_platinum' },
  'Diamond Membership': { amount: 500, reason: 'membership_diamond' }
};

/** The token grant for a product name, or null when it's not a membership. */
export function membershipTokenGrant(
  productName: string | null | undefined
): MembershipGrant | null {
  if (!productName) return null;
  return GRANTS[productName] ?? null;
}

/** Ledger ref for one subscription cycle: subscription:period:price. */
export function membershipGrantRef(
  subscriptionId: string,
  periodStartIso: string,
  priceId: string
): string {
  return `sub:${subscriptionId}:${periodStartIso}:${priceId}`;
}
