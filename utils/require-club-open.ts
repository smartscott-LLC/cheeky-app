import 'server-only';
/**
 * The soft-open enforcement point (founder greenlight 2026-10-27). Called at
 * the top of every gated server page: the street, door, lounge, account,
 * card, store and welcome booklet are open; the club world is not until the
 * switch flips or the member carries an early-access invite.
 *
 * Reads through supabaseAdmin (service role) with short in-process caches —
 * at home-server scale that's one row read per 30s/60s, not per request.
 */
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabase/admin';
import { gate, type GateFacts } from './launch-gate';

let configCache: { open: boolean; opensAt: string } | null = null;
let configCacheAt = 0;
const accessCache = new Map<string, { ok: boolean; at: number }>();

export async function launchState(): Promise<{ open: boolean; opensAt: Date }> {
  if (!configCache || Date.now() - configCacheAt > 30_000) {
    const { data } = await supabaseAdmin
      .from('launch_config')
      .select('open, opens_at')
      .eq('id', true)
      .maybeSingle();
    configCache = data
      ? { open: Boolean(data.open), opensAt: data.opens_at }
      : { open: true, opensAt: new Date().toISOString() }; // fail OPEN: no config row = launched club, never a locked club
    configCacheAt = Date.now();
  }
  return { open: configCache.open, opensAt: new Date(configCache.opensAt) };
}

async function earlyAccessOf(userId: string): Promise<boolean> {
  const hit = accessCache.get(userId);
  if (hit && Date.now() - hit.at < 60_000) return hit.ok;
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('early_access')
    .eq('id', userId)
    .maybeSingle();
  const ok = Boolean(data?.early_access);
  accessCache.set(userId, { ok, at: Date.now() });
  return ok;
}

/**
 * Call from a gated page after resolving the user. `userId | null` — null
 * means signed out. Redirects per the pure gate; returns when access is ok.
 */
export async function requireClubOpen(
  pathname: string,
  userId: string | null
): Promise<void> {
  const { open } = await launchState();
  const facts: GateFacts = {
    signedIn: Boolean(userId),
    earlyAccess: userId ? await earlyAccessOf(userId) : false,
    launchOpen: open
  };
  const decision = gate(pathname, facts);
  if (decision === 'to-signin') redirect('/signin');
  if (decision === 'to-welcome') redirect('/welcome?roped=1');
}
