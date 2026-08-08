import 'server-only';
import { supabaseAdmin } from '@/utils/supabase/admin';

export type SwagBenefitType = 'membership' | 'tokens' | 'gift' | 'bundle';
export type SwagActorType = 'owner' | 'character' | 'system';

/**
 * Generates a swag code through the rule-set RPC (owner/system: anything;
 * character: only items the rules allow, within weekly caps). Service-role
 * only — members can never mint codes (no authenticated grant exists).
 */
export async function generateSwagCode(opts: {
  benefitType: SwagBenefitType;
  benefitValue: string;
  actorType: SwagActorType;
  actorRef?: string | null;
  maxUses?: number;
  expiresAt?: string | null;
  notes?: string | null;
}): Promise<{ code?: string; error?: string }> {
  const { data, error } = await supabaseAdmin.rpc('generate_swag_code', {
    p_benefit_type: opts.benefitType,
    p_benefit_value: opts.benefitValue,
    p_actor_type: opts.actorType,
    p_actor_ref: opts.actorRef ?? undefined,
    p_expires_at: opts.expiresAt ?? undefined,
    p_max_uses: opts.maxUses ?? 1,
    p_notes: opts.notes ?? undefined
  });
  if (error) return { error: error.message };
  return { code: data as string };
}

/**
 * Logs a flag: the cast tried an owner-only item. The owner reviews these
 * in the Booth (the "flag job") with the member + the cast's reason.
 */
export async function flagSwagRequest(opts: {
  userId: string;
  actorRef: string;
  benefitType: SwagBenefitType;
  benefitValue: string;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabaseAdmin.rpc('flag_swag_request', {
    p_user: opts.userId,
    p_actor_ref: opts.actorRef,
    p_benefit_type: opts.benefitType,
    p_benefit_value: opts.benefitValue,
    p_reason: opts.reason ?? undefined
  });
  if (error) console.error('flag_swag_request failed:', error.message);
}
