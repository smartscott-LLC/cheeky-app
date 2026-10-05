/**
 * Square webhook geometry — PURE (no I/O): signature verification per
 * developer.squareup.com/docs/webhooks and the item contract parsed from
 * ITEM_LIBRARY.csv (the store catalog IS the grant spec — one table,
 * reviewed by the founder, tested to the last SKU).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SquareItemGrant {
  sku: string;
  name: string;
  kind: 'membership' | 'trial' | 'tokens' | 'gift_set';
  tier: 'gold' | 'platinum' | 'diamond' | 'silver' | null;
  days: number | null; // null = ongoing / n/a
  tokens: number; // store-granted tokens (trials pro-rate: 30/90/300)
  amountCents: number;
}

/** The contract, transcribed from ITEM_LIBRARY.csv 2026-10-05. */
export const SQUARE_ITEMS: Record<string, SquareItemGrant> = Object.fromEntries(
  (
    [
      ['SAVEBKOLZYUATZKMPCP4QAH2', 'tokens', null, null, 0, 498, '100 Tokens'],
      ['DUUV6K74PPTEKKOPMCJPBJYM', 'tokens', null, null, 0, 998, '1000 Tokens'],
      [
        'EIYSBU27YOCGCWVMM3YIDO7X',
        'membership',
        'diamond',
        30,
        500,
        2998,
        '30-Day Diamond Membership'
      ],
      [
        'EN55HDVVDMNO7LSJ4S4SFWXQ',
        'membership',
        'gold',
        30,
        50,
        999,
        '30-Day Gold Membership'
      ],
      [
        'XOJRF2KX2G3G7VAITEHPOO7Z',
        'membership',
        'platinum',
        30,
        150,
        1999,
        '30-Day Platinum Membership'
      ],
      [
        'ITAE65Q7OO3O5OXHE3G66KGH',
        'trial',
        'diamond',
        7,
        300,
        1498,
        '7-Day Diamond Membership'
      ],
      [
        'ERZYKVSLIPQJLAD6UTL4HIYB',
        'trial',
        'gold',
        7,
        30,
        498,
        '7-Day Gold Membership'
      ],
      [
        'HWWBBU6Z55FBJQTO2F2EGHVO',
        'trial',
        'platinum',
        7,
        90,
        998,
        '7-Day Platinum Membership'
      ],
      [
        'E3PDADBNA7ZYEIVZWFIXH22W',
        'gift_set',
        null,
        null,
        0,
        598,
        'Gift Basket'
      ],
      [
        'YRON3YOV3X2H42H7WRFWIXVO',
        'gift_set',
        null,
        null,
        0,
        198,
        'Horn Bundle'
      ],
      [
        'N3ZJ7UDMROCSORKZAGWC2MLA',
        'membership',
        'silver',
        null,
        0,
        0,
        'Ongoing Silver Membership'
      ]
    ] as const
  ).map(([sku, kind, tier, days, tokens, amountCents, name]) => [
    sku,
    { sku, name, kind, tier, days, tokens, amountCents }
  ])
);

export function grantForItem(nameOrSku: string): SquareItemGrant | null {
  const direct = SQUARE_ITEMS[nameOrSku];
  if (direct) return direct;
  const byName = Object.values(SQUARE_ITEMS).find((i) => i.name === nameOrSku);
  return byName ?? null;
}

/**
 * Square signature: base64(HMAC-SHA256(notificationUrl + timestamp, key)).
 * The URL must be the EXACT registered endpoint (scheme + host + path) —
 * behind Cloudflare, derive it from config, never from request internals.
 */
export function verifySquareSignature(
  notificationUrl: string,
  timestamp: string,
  signatureB64: string,
  signatureKey: string
): boolean {
  if (!timestamp || !signatureB64 || !signatureKey) return false;
  // Reject stale deliveries (Square includes the epoch seconds it signed).
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expect = createHmac('sha256', signatureKey)
    .update(notificationUrl + timestamp, 'utf8')
    .digest();
  let got: Buffer;
  try {
    got = Buffer.from(signatureB64, 'base64');
  } catch {
    return false;
  }
  if (got.length !== expect.length) return false;
  return timingSafeEqual(expect, got);
}
