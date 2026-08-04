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
  announcement?: unknown;
  unpurchased?: { id: string; display_name: string | null; verified_at: string | null }[];
  metrics?: {
    members: number;
    verified: number;
    paid: number;
    tokensOut: number;
    giftsOut: number;
    redeemed: number;
    newThisWeek: number;
    msgsToday: number;
  };
  events?: {
    id: string;
    kind: string;
    floor: string;
    starts_at: string;
    status: string;
    token_cost: number;
    entrants: number;
  }[];
  ledger?: {
    id: number;
    delta: number;
    reason: string | null;
    ref: string | null;
    created_at: string;
  }[];
  catalog?: { id: string; slug: string; name: string; emoji: string; token_cost: number }[];
  castModel?: string;
  watchdogModel?: string;
  closures?: { floor: string; reason: string | null; until: string | null }[];
  error?: string;
}> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const sixHoursAgo = new Date(Date.now() - 6 * 3_600_000).toISOString();

  const [
    config,
    rules,
    codes,
    grants,
    flags,
    announcement,
    profiles,
    activeSubs,
    countMembers,
    countVerified,
    countPaid,
    sumTokens,
    countGifts,
    countRedeemed,
    countNew,
    countMsgs,
    events,
    ledger,
    catalog,
    modelRow,
    closures
  ] = await Promise.all([
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
      .limit(25),
    supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('profiles')
      .select('id, display_name, verified_at, created_at')
      .not('verified_at', 'is', null)
      .order('verified_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .in('status', ['trialing', 'active']),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('verified_at', 'is', null),
    supabaseAdmin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['trialing', 'active']),
    supabaseAdmin.from('token_ledger').select('delta'),
    supabaseAdmin.from('gift_inventory').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('benefit_grants').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo),
    supabaseAdmin
      .from('events')
      .select('id, kind, floor, starts_at, status, token_cost')
      .gte('starts_at', sixHoursAgo)
      .order('starts_at', { ascending: true })
      .limit(12),
    supabaseAdmin
      .from('token_ledger')
      .select('delta, reason, ref, created_at')
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('gift_catalog')
      .select('id, slug, name, emoji, token_cost')
      .eq('active', true)
      .order('token_cost')
      .limit(30),
    supabaseAdmin.from('model_config').select('cast_model, watchdog_model').eq('id', true).maybeSingle(),
    supabaseAdmin.from('floor_closures').select('floor, reason, until')
  ]);

  const paidUsers = new Set((activeSubs.data ?? []).map((s) => s.user_id));
  const unpurchased = (profiles.data ?? []).filter(
    (p) => !paidUsers.has(p.id)
  );

  const eventIds = (events.data ?? []).map((e) => e.id);
  const { data: entries } =
    eventIds.length > 0
      ? await supabaseAdmin
          .from('event_entries')
          .select('event_id')
          .in('event_id', eventIds)
          .in('status', ['reserved', 'locked'])
      : { data: [] };
  const entryCounts = new Map<string, number>();
  (entries ?? []).forEach((en) =>
    entryCounts.set(en.event_id, (entryCounts.get(en.event_id) ?? 0) + 1)
  );

  return {
    engineEnabled: config.data?.engine_enabled ?? true,
    rules: (rules.data ?? []) as never,
    codes: codes.data ?? [],
    grants: grants.data ?? [],
    flags: flags.data ?? [],
    announcement: announcement.data ?? null,
    unpurchased: unpurchased.map((p) => ({
      id: p.id,
      display_name: p.display_name,
      verified_at: p.verified_at
    })),
    metrics: {
      members: countMembers.count ?? 0,
      verified: countVerified.count ?? 0,
      paid: countPaid.count ?? 0,
      tokensOut:
        (sumTokens.data ?? []).reduce((s, r) => s + (r.delta ?? 0), 0) ?? 0,
      giftsOut: countGifts.count ?? 0,
      redeemed: countRedeemed.count ?? 0,
      newThisWeek: countNew.count ?? 0,
      msgsToday: countMsgs.count ?? 0
    },
    events: (events.data ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      floor: e.floor,
      starts_at: e.starts_at,
      status: e.status,
      token_cost: e.token_cost,
      entrants: entryCounts.get(e.id) ?? 0
    })),
    ledger: (ledger.data ?? []) as never,
    catalog: (catalog.data ?? []) as never,
    castModel: modelRow.data?.cast_model ?? 'deepseek-chat',
    watchdogModel:
      modelRow.data?.watchdog_model ?? 'nvidia/nemotron-nano-12b-v2-vl:free',
    closures: (closures.data ?? []) as never
  };
}

/** Swaps the cast + watchdog models from the Den — no redeploy needed. */
export async function ownerUpdateModels(input: {
  key?: string;
  castModel: string;
  watchdogModel: string;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { error } = await supabaseAdmin
    .from('model_config')
    .update({
      cast_model: input.castModel.trim() || 'deepseek-chat',
      watchdog_model:
        input.watchdogModel.trim() || 'nvidia/nemotron-nano-12b-v2-vl:free',
      updated_at: new Date().toISOString()
    })
    .eq('id', true);
  return error ? { error: error.message } : {};
}

/** Closes or reopens a floor from the Den (under-construction notice). */
export async function ownerSetFloorClosure(input: {
  key?: string;
  floor: string;
  closed: boolean;
  reason?: string;
  hours?: number;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  if (!['silver', 'gold', 'platinum', 'diamond'].includes(input.floor))
    return { error: 'unknown floor' };
  if (input.closed) {
    const { error } = await supabaseAdmin.from('floor_closures').upsert({
      floor: input.floor,
      reason: input.reason?.trim() || null,
      until:
        input.hours && input.hours > 0
          ? new Date(Date.now() + input.hours * 3_600_000).toISOString()
          : null
    });
    return error ? { error: error.message } : {};
  }
  const { error } = await supabaseAdmin
    .from('floor_closures')
    .delete()
    .eq('floor', input.floor);
  return error ? { error: error.message } : {};
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

/** Resolves a flag: grant directly, hand the cast a code to deliver, or dismiss. */
export async function ownerResolveFlag(input: {
  key?: string;
  flagId: string;
  action: 'grant' | 'give-code' | 'dismiss';
}): Promise<{ error?: string; code?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { data: flag } = await supabaseAdmin
    .from('swag_flags')
    .select('*')
    .eq('id', input.flagId)
    .maybeSingle();
  if (!flag || flag.status !== 'open') return { error: 'flag not open' };

  let minted: string | undefined;

  if (input.action === 'grant') {
    if (!flag.user_id) return { error: 'flag has no member' };
    const { error } = await supabaseAdmin.rpc('owner_grant', {
      p_user: flag.user_id,
      p_benefit_type: flag.benefit_type,
      p_benefit_value: flag.benefit_value,
      p_reason: flag.reason ? `flag:${flag.actor_ref ?? 'cast'}:${flag.reason}` : `flag:${flag.actor_ref ?? 'cast'}`,
      p_days: 30
    });
    if (error) return { error: error.message };
  } else if (input.action === 'give-code') {
    // Mint an owner code tied to this member + the flagging character, so
    // the cast can hand it over in-character.
    if (!flag.user_id) return { error: 'flag has no member' };
    const { code, error } = await generateSwagCode({
      benefitType: flag.benefit_type as SwagBenefitType,
      benefitValue: flag.benefit_value,
      actorType: 'owner',
      notes: flag.reason?.trim() || null
    });
    if (error) return { error };
    const { error: updErr } = await supabaseAdmin
      .from('swag_codes')
      .update({
        deliver_to_user_id: flag.user_id,
        deliver_via_actor: flag.actor_ref ?? null
      })
      .eq('code', code as string);
    if (updErr) return { error: updErr.message };
    minted = code;
  }

  const { error } = await supabaseAdmin
    .from('swag_flags')
    .update({ status: input.action === 'dismiss' ? 'dismissed' : 'granted', resolved_at: new Date().toISOString() })
    .eq('id', input.flagId);
  if (error) return { error: error.message };
  return { code: minted };
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

/** Posts the floor announcement (or clears it) — the marquee goes live
 * on the floors within a minute. One live announcement at a time. */
export async function ownerPostAnnouncement(input: {
  key?: string;
  message?: string;
  displayStyle?: 'scroll' | 'roll' | 'fade';
  hours?: number;
  clear?: boolean;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };

  if (input.clear) {
    const { error } = await supabaseAdmin
      .from('announcements')
      .update({ active: false })
      .eq('active', true);
    return error ? { error: error.message } : {};
  }

  const message = input.message?.trim();
  if (!message) return { error: 'message required' };
  const style =
    input.displayStyle === 'roll' || input.displayStyle === 'fade'
      ? input.displayStyle
      : 'scroll';

  // One marquee at a time — the new announcement is THE announcement.
  await supabaseAdmin
    .from('announcements')
    .update({ active: false })
    .eq('active', true);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabaseAdmin.from('announcements').insert({
    message,
    display_style: style,
    ends_at:
      input.hours && input.hours > 0
        ? new Date(Date.now() + input.hours * 3_600_000).toISOString()
        : null,
    created_by: user?.id ?? null
  });
  return error ? { error: error.message } : {};
}
