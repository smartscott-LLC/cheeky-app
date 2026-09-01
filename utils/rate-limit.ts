import { createClient } from '@/utils/supabase/server';

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
