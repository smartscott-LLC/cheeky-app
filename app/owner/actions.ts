'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateSwagCode, type SwagBenefitType } from '@/utils/swag';

/**
 * The Owner's Back Door: authorized if the signed-in user IS the owner
 * (their account is in owner_accounts — no key to lose), OR the legacy
 * ADMIN_KEY matches (fallback path). Both checked server-side.
 */
async function authorized(key?: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabaseAdmin
      .from('owner_accounts')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) return true;
  }
  const adminKey = process.env.ADMIN_KEY;
  return Boolean(adminKey && key === adminKey);
}

/** Fetches the full Booth state (engine, rules, codes, grants, flags). */
export async function ownerFetchState(input: {
  key?: string;
}): Promise<{
  engineEnabled?: boolean;
  rules?: { benefit_type: string; benefit_value: string; owner_only: boolean; weekly_limit: number | null }[];
  codes?: unknown[];
  grants?: unknown[];
  flags?: unknown[];
  error?: string;
}> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const [config, rules, codes, grants, flags] = await Promise.all([
    supabaseAdmin.from('promo_config').select('engine_enabled').maybeSingle(),
    supabaseAdmin
      .from('swag_rules')
      .select('benefit_type, benefit_value, owner_only, weekly_limit')
      .order('benefit_type')
      .order('benefit_value'),
    supabaseAdmin
      .from('swag_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40),
    supabaseAdmin
      .from('benefit_grants')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('swag_flags')
      .select('*, profiles(display_name), characters(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(25)
  ]);
  return {
    engineEnabled: config.data?.engine_enabled ?? true,
    rules: (rules.data ?? []) as never,
    codes: codes.data ?? [],
    grants: grants.data ?? [],
    flags: flags.data ?? []
  };
}

/** Generates one or more codes (owner path — anything goes). */
export async function ownerGenerateCodes(input: {
  key?: string;
  benefitType: SwagBenefitType;
  benefitValue: string;
  count: number;
  notes?: string;
}): Promise<{ codes?: string[]; error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const count = Math.min(Math.max(Math.floor(input.count) || 1, 1), 100);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const { code, error } = await generateSwagCode({
      benefitType: input.benefitType,
      benefitValue: input.benefitValue.trim(),
      actorType: 'owner',
      notes: input.notes?.trim() || null
    });
    if (error) return { error };
    codes.push(code as string);
  }
  return { codes };
}

/** Grants a benefit directly to a member by email (owner's key). */
export async function ownerGrantDirect(input: {
  key?: string;
  email: string;
  benefitType: SwagBenefitType;
  benefitValue: string;
  reason?: string;
  days?: number;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  const target = users?.users.find(
    (u) => u.email?.toLowerCase() === input.email.trim().toLowerCase()
  );
  if (!target) return { error: 'user not found' };

  const { error } = await supabaseAdmin.rpc('owner_grant', {
    p_user: target.id,
    p_benefit_type: input.benefitType,
    p_benefit_value: input.benefitValue.trim(),
    p_reason: input.reason?.trim() || 'owner',
    p_days: input.days ?? 30
  });
  if (error) return { error: error.message };
  return {};
}

/** Resolves a flag: grant the flagged benefit to the member, or dismiss. */
export async function ownerResolveFlag(input: {
  key?: string;
  flagId: string;
  action: 'grant' | 'dismiss';
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { data: flag } = await supabaseAdmin
    .from('swag_flags')
    .select('*')
    .eq('id', input.flagId)
    .maybeSingle();
  if (!flag || flag.status !== 'open') return { error: 'flag not open' };
  if (!flag.user_id) return { error: 'flag has no member' };

  if (input.action === 'grant') {
    const { error } = await supabaseAdmin.rpc('owner_grant', {
      p_user: flag.user_id,
      p_benefit_type: flag.benefit_type,
      p_benefit_value: flag.benefit_value,
      p_reason: flag.reason ? `flag:${flag.actor_ref ?? 'cast'}:${flag.reason}` : `flag:${flag.actor_ref ?? 'cast'}`,
      p_days: 30
    });
    if (error) return { error: error.message };
  }

  const { error } = await supabaseAdmin
    .from('swag_flags')
    .update({ status: input.action, resolved_at: new Date().toISOString() })
    .eq('id', input.flagId);
  if (error) return { error: error.message };
  return {};
}

/** Kills or restores the whole engine (fail-closed). */
export async function ownerToggleEngine(input: {
  key?: string;
  enabled: boolean;
}): Promise<{ enabled?: boolean; error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { error } = await supabaseAdmin
    .from('promo_config')
    .update({ engine_enabled: input.enabled })
    .eq('id', true);
  if (error) return { error: error.message };
  return { enabled: input.enabled };
}
