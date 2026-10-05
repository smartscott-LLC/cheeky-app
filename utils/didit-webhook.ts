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

/** Canonical JSON: sort keys recursively, stringify compact, keep Unicode. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map(
      (k) =>
        `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`
    );
  return `{${parts.join(',')}}`;
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
