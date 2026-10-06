/**
 * Didit webhook signature verification — PURE (no I/O, clock injected),
 * per docs.didit.me/integration/webhooks.
 *
 * Modes, in preference order:
 *   v2    HMAC-SHA256 over canonical JSON (recursively key-sorted, no
 *         whitespace, Unicode preserved) — X-Signature-V2
 *   raw   HMAC-SHA256 over the exact raw bytes — X-Signature (only trusted
 *         when the stack never re-encodes the body; we verify against the
 *         raw string we received, so we're honest)
 *   none  → reject. X-Signature-Simple is DEPRECATED (envelope-only); we
 *         refuse it outright and require a decision re-fetch instead —
 *         never trust an unauthenticated verdict body.
 *
 * Freshness: |now - X-Timestamp| <= 300s. Comparison: constant-time.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface DiditHeaders {
  signature?: string | null;
  signatureV2?: string | null;
  timestamp?: string | null;
}

export type VerifyResult =
  { ok: true; mode: 'v2' | 'raw' } | { ok: false; error: string };

/**
 * Didit canonicalisation, matching their server exactly:
 * shortenFloats (whole-number floats → ints: 1.0 → 1) THEN recursive
 * lexicographic key sort (array order preserved) THEN compact stringify
 * with unescaped Unicode (the JS default).
 */
function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [
        k,
        shortenFloats(x)
      ])
    );
  }
  if (typeof v === 'number' && !Number.isInteger(v) && v % 1 === 0)
    return Math.trunc(v);
  return v;
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(value)));
}

function hmac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export function verifyDiditWebhook(
  rawBody: string,
  headers: DiditHeaders,
  secret: string,
  nowSec: number
): VerifyResult {
  const ts = Number(headers.timestamp ?? '');
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) {
    return { ok: false, error: 'timestamp missing or stale (>300s)' };
  }

  if (headers.signatureV2) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return { ok: false, error: 'body is not valid JSON' };
    }
    if (safeEqualHex(hmac(secret, canonicalJson(parsed)), headers.signatureV2))
      return { ok: true, mode: 'v2' };
    return { ok: false, error: 'signature mismatch (v2)' };
  }

  if (headers.signature) {
    if (safeEqualHex(hmac(secret, rawBody), headers.signature))
      return { ok: true, mode: 'raw' };
    return { ok: false, error: 'signature mismatch (raw)' };
  }

  return { ok: false, error: 'no acceptable signature header' };
}
