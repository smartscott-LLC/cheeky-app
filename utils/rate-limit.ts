import { createClient } from '@/utils/supabase/server';

// Known rate-limit error names raised by SQL RPCs.
// When these appear, the UI should show a graceful "waiting on refresh"
// state instead of an error toast — the user just needs to come back later.
export const RATE_LIMIT_ERRORS = new Set([
  'daily_plays_limit',   // matchmaker plays dial
  'daily_trios_limit',   // L³ trio dial
  'horn_cooldown'        // lounge horn (1/hour)
]);

/**
 * Tell whether an RPC error is a rate-limit hit (not a real failure).
 * Callers use this to surface "waiting on refresh" instead of an error.
 */
export function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return RATE_LIMIT_ERRORS.has(msg);
}

/**
 * Fixed-window rate limit enforced in Postgres (the bump_rate_limit RPC) so
 * it holds across serverless instances — the same server-side philosophy as
 * the messaging caps. Returns true when the caller is still within budget.
 *
 * Fails open on infra hiccups: a limiter outage must never lock the club,
 * and the error is logged so it can't go unnoticed.
 */
export async function withinBudget(
  key: string,
  windowSeconds: number,
  max: number
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('bump_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max
  });
  if (error) {
    console.error('rate limit check failed:', error.message);
    return true;
  }
  return data === true;
}

