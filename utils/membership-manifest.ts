import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import { membershipToSection } from '@/utils/top-schema';
import { topPut } from '@/utils/top';

/**
 * The membership mirror (docs/PRD-user-manifest.md). current_tier() is the
 * single authority on a member's floor — it already resolves guest passes,
 * subscriptions and entitlements — so the mirror just asks it. Called from
 * every door that changes membership state: verification, subscription
 * webhooks, complimentary grants, guest passes.
 *
 * The admin client is INJECTED, not imported: this module is consumed by
 * utils/supabase/admin.ts itself, and importing supabaseAdmin back from
 * there would recreate the module-eval cycle that took down the BioCard
 * chunk. Dependencies point one way, always.
 *
 * Known staleness window: an expiring guest pass fires no webhook, so a
 * mirrored tier can lag until the member's next membership event. Display
 * surfaces that must be exact (the read door) overlay the LIVE tier —
 * the mirror is the view, current_tier() is the vote.
 */
export async function syncMembershipToManifest(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const [
    { data: tierRow, error: tErr },
    { data: profile, error: pErr },
    { data: pass }
  ] = await Promise.all([
    admin.rpc('current_tier', { p_user: userId }),
    admin
      .from('profiles')
      .select('created_at, verified_at')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('guest_passes')
      .select('expires_at')
      .eq('guest_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle()
  ]);

  if (tErr || pErr) {
    return {
      ok: false,
      error: tErr?.message ?? pErr?.message ?? 'read failed'
    };
  }
  if (!profile) return { ok: false, error: 'no profile row' };

  return topPut(
    userId,
    'membership',
    membershipToSection({
      tier: String(tierRow ?? 'silver'),
      verifiedAt: profile.verified_at,
      since: profile.created_at,
      guestPassUntil: pass?.expires_at ?? null
    })
  );
}
