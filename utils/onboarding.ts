import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import {
  onboardingStep,
  STEP_ROUTE,
  type OnboardingStep
} from '@/utils/onboarding-schema';

/**
 * The DB half of the front-door gate (docs/PRD-onboarding.md).
 *
 * Membership record = ANY of: a subscription row (Square-era writes land
 * here too — the $0 Silver passes through for the record), an entitlement
 * grant (comps), or an unexpired guest pass. Legacy Stripe subscriptions
 * count — they're records.
 */

export { onboardingStep, STEP_ROUTE };
export type { OnboardingStep };

const CONSENT_TYPES = 4; // terms, privacy, AUP, best practices — Brutus's door

export async function getOnboardingStep(
  client: SupabaseClient<Database>,
  userId: string
): Promise<OnboardingStep> {
  const nowIso = new Date().toISOString();
  const [consents, profile, sub, grant, pass] = await Promise.all([
    client.from('consents').select('consent_type').eq('user_id', userId),
    client
      .from('profiles')
      .select('verified_at')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    client
      .from('entitlement_grants')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    client
      .from('guest_passes')
      .select('id')
      .eq('guest_id', userId)
      .gt('expires_at', nowIso)
      .limit(1)
      .maybeSingle()
  ]);

  return onboardingStep({
    consentsComplete:
      new Set((consents.data ?? []).map((c) => c.consent_type)).size >=
      CONSENT_TYPES,
    verified: Boolean(profile.data?.verified_at),
    hasMembership: Boolean(sub.data || grant.data || pass.data)
  });
}
