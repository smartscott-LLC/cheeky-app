/**
 * Extracts the token count from a Stripe product name ("Cheeky Token Bag -
 * 100 Tokens"). Returns null when the name isn't a token product. Shared so
 * the webhook credit path and the tests read the same rule.
 */
export function parseTokenAmount(productName: string): number | null {
  const match = /(\d+)\s*Tokens?/i.exec(productName);
  return match ? parseInt(match[1], 10) : null;
}
