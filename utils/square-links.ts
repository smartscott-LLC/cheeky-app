// The Square online storefront — the single source of checkout truth since
// the Stripe retirement (2026-10). Every purchase CTA in the club lands here;
// inventory + prices on these pages are Square-side, per the Square
// webhook contract in utils/square-webhook.ts (ITEM_LIBRARY.csv).
// (Owner-review 2026-10-11: paths confirmed live against the store's own
// sitemap.xml.)

export const SQUARE_MEMBERSHIPS_URL =
  'https://smartscott.square.site/memberships';
export const SQUARE_TOKENS_URL =
  'https://smartscott.square.site/token-packages';
