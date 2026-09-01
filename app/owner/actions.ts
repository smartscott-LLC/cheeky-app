'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateSwagCode, type SwagBenefitType } from '@/utils/swag';
import { sendClubMail } from '@/utils/email';
import { CONTACT } from '@/utils/contact';
import { authorized } from './actions-helpers';
import { getStreamServer, streamEnabled } from '@/utils/stream/server';

/**
 * The Owner's Back Door: authorized if the signed-in user IS the owner
 * (their account is in owner_accounts — no key to lose), OR the legacy
 * ADMIN_KEY matches (fallback path). Both checked server-side.
 */

/** Fetches the full Booth state (engine, rules, codes, grants, flags). */
export async function ownerFetchState(input: { key?: string }): Promise<{
  engineEnabled?: boolean;
  rules?: {
    benefit_type: string;
    benefit_value: string;
    owner_only: boolean;
    weekly_limit: number | null;
  }[];
  codes?: unknown[];
  grants?: unknown[];
  flags?: unknown[];
  staleCodes?: unknown[];
  announcement?: unknown;
  unpurchased?: {
    id: string;
    display_name: string | null;
    verified_at: string | null;
  }[];
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
  catalog?: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
    token_cost: number;
  }[];
  castModel?: string;
  watchdogModel?: string;
  closures?: { floor: string; reason: string | null; until: string | null }[];
  reports?: {
    id: number;
    reason: string;
    verdict: string | null;
    category: string | null;
    confidence: number | null;
    review_summary: string | null;
    reported_id: string;
    created_at: string;
  }[];
  banned?: {
    email: string;
    reason: string;
    banned_until: string | null;
    created_at: string;
  }[];
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
    staleCodes,
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
    closures,
    reports,
    banned
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
      .from('swag_codes_stale')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
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
    supabaseAdmin
      .from('gift_inventory')
      .select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('benefit_grants')
      .select('id', { count: 'exact', head: true }),
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
    supabaseAdmin
      .from('model_config')
      .select('cast_model, watchdog_model')
      .eq('id', true)
      .maybeSingle(),
    supabaseAdmin.from('floor_closures').select('floor, reason, until'),
    supabaseAdmin
      .from('reports')
      .select(
        'id, reason, verdict, category, confidence, review_summary, reported_id, created_at'
      )
      .is('human_confirmed_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('banned_accounts')
      .select('email, reason, banned_until, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  const paidUsers = new Set((activeSubs.data ?? []).map((s) => s.user_id));
  const unpurchased = (profiles.data ?? []).filter((p) => !paidUsers.has(p.id));

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
    staleCodes: staleCodes.data ?? [],
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
    closures: (closures.data ?? []) as never,
    reports: (reports.data ?? []) as never,
    banned: (banned.data ?? []) as never
  };
}

/** The human half of DateSafe: upholds a held report or lifts the hold. */
export async function ownerResolveReport(input: {
  key?: string;
  reportId: number;
  verdict: 'upheld' | 'dismissed';
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { data: report } = await supabaseAdmin
    .from('reports')
    .select('id, image_url')
    .eq('id', input.reportId)
    .maybeSingle();
  if (!report) return { error: 'report not found' };
  const now = new Date().toISOString();

  if (input.verdict === 'dismissed') {
    // Unfounded — the hold lifts and the reported photo goes back up.
    if (report.image_url) {
      const storagePath = report.image_url.split('/profiles/')[1];
      if (storagePath) {
        await supabaseAdmin
          .from('photos')
          .update({ held_at: null })
          .eq('storage_path', storagePath);
      }
    }
    await supabaseAdmin
      .from('reports')
      .update({
        human_verdict: 'dismissed',
        human_confirmed_at: now,
        status: 'reviewed',
        outcome: 'no_action',
        resolved_at: now
      })
      .eq('id', report.id);
  } else {
    await supabaseAdmin
      .from('reports')
      .update({
        human_verdict: 'upheld',
        human_confirmed_at: now,
        status: 'reviewed',
        outcome: 'action_taken',
        resolved_at: now
      })
      .eq('id', report.id);
  }
  return {};
}

/**
 * The Den's open door: anyone who finds the office without the key can
 * leave a message for the owner. Public on purpose — the message is the
 * point (a turned-away visitor becomes a conversation). Honeypot-guarded;
 * lands in the club's general desk inbox.
 */
export async function ownerLeaveMessage(
  formData: FormData
): Promise<{ error?: string }> {
  if (String(formData.get('company') ?? '').trim()) {
    return { error: 'nice try, robot' };
  }
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email)) {
    return {
      error: 'A real email, please — so the owner can get back to you.'
    };
  }
  if (message.length < 5 || message.length > 2000) {
    return { error: 'A real message, please — a sentence or two is plenty.' };
  }

  await sendClubMail({
    to: CONTACT.info,
    subject: '🦁 A message left at the Lions Den door',
    text: `From: ${email}\n\n${message}`
  });
  return {};
}

/** Bans (or pardons) an email in the registry the door checks at signup. */
export async function ownerSetBan(input: {
  key?: string;
  email: string;
  banned: boolean;
  reason?: string;
  years?: number;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const email = input.email.trim().toLowerCase();
  if (input.banned) {
    const { error } = await supabaseAdmin.from('banned_accounts').upsert({
      email,
      reason: input.reason?.trim() || 'banned by the owner',
      banned_until:
        input.years && input.years > 0
          ? new Date(
              Date.now() + input.years * 365 * 24 * 3_600_000
            ).toISOString()
          : null
    });
    if (error) return { error: error.message };
    // Best-effort notice — the door will refuse this email.
    await sendClubMail({
      to: email,
      subject: 'Club Cheeky — account notice',
      text: `This account has been closed per club policy${
        input.years && input.years > 0 ? ` for ${input.years} year(s)` : ''
      }.

The decision can be appealed through the support desk at helpdesk@smartscott.online.

— The club`
    });
    return {};
  }
  const { error } = await supabaseAdmin
    .from('banned_accounts')
    .delete()
    .eq('email', email);
  return error ? { error: error.message } : {};
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
      p_reason: flag.reason
        ? `flag:${flag.actor_ref ?? 'cast'}:${flag.reason}`
        : `flag:${flag.actor_ref ?? 'cast'}`,
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
    .update({
      status: input.action === 'dismiss' ? 'dismissed' : 'granted',
      resolved_at: new Date().toISOString()
    })
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

/**
 * The Cheeky Lounge — owner view (PRD docs/PRD-club-chat.md §10 owner
 * dashboard). The Den's monitoring channel: live room feed, the Horn
 * ticker, pending take-private invites, and a one-click chat ban. Service
 * role bypasses RLS so the owner can see every message regardless of
 * blocks — moderation demands the full picture.
 */
export async function ownerFetchLounge(input: { key?: string }): Promise<{
  messages?: {
    id: number;
    room: string;
    sender_id: string;
    body: string;
    floor_tag: string;
    horn: boolean;
    created_at: string;
    sender_name: string | null;
  }[];
  invites?: {
    id: string;
    inviter_id: string;
    invitee_id: string;
    status: string;
    created_at: string;
    inviter_name: string | null;
    invitee_name: string | null;
  }[];
  bans?: {
    id: string;
    user_id: string;
    banned_until: string;
    reason: string;
    created_at: string;
    user_name: string | null;
  }[];
  announcements?: {
    id: number;
    body: string;
    kind: string;
    created_at: string;
  }[];
  totals?: {
    messages_24h: number;
    horn_24h: number;
    invites_pending: number;
    active_bans: number;
  };
  error?: string;
}> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };

  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const now = new Date().toISOString();

  const [
    messages,
    invites,
    bans,
    announcements,
    profileIds,
    countMessages,
    countHorn,
    countInvites,
    countBans
  ] = await Promise.all([
    supabaseAdmin
      .from('club_chat_messages')
      .select(
        'id, room, sender_id, body, floor_tag, horn, created_at, profiles(display_name)'
      )
      .order('created_at', { ascending: false })
      .limit(60),
    supabaseAdmin
      .from('club_chat_invites')
      .select(
        'id, inviter_id, invitee_id, status, created_at, inviter:profiles!club_chat_invites_inviter_id_fkey(display_name), invitee:profiles!club_chat_invites_invitee_id_fkey(display_name)'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('club_chat_bans')
      .select(
        'id, user_id, banned_until, reason, created_at, profiles(display_name)'
      )
      .gt('banned_until', now)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('club_announcements')
      .select('id, body, kind, created_at')
      .eq('kind', 'horn')
      .order('created_at', { ascending: false })
      .limit(15),
    (async () => {
      // Collect every profile id we'll need to display.
      const ids = new Set<string>();
      return ids;
    })(),
    supabaseAdmin
      .from('club_chat_messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo),
    supabaseAdmin
      .from('club_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('horn', true)
      .gte('created_at', dayAgo),
    supabaseAdmin
      .from('club_chat_invites')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin
      .from('club_chat_bans')
      .select('id', { count: 'exact', head: true })
      .gt('banned_until', now)
  ]);
  void profileIds;

  const msgRows = (messages.data ?? []).map((m) => {
    const p = (m as unknown as { profiles: { display_name: string } | null })
      .profiles;
    return {
      id: m.id,
      room: m.room,
      sender_id: m.sender_id,
      body: m.body,
      floor_tag: m.floor_tag,
      horn: m.horn,
      created_at: m.created_at,
      sender_name: p?.display_name ?? null
    };
  });
  const inviteRows = (invites.data ?? []).map((i) => {
    const r = i as unknown as {
      inviter: { display_name: string } | null;
      invitee: { display_name: string } | null;
    };
    return {
      id: i.id,
      inviter_id: i.inviter_id,
      invitee_id: i.invitee_id,
      status: i.status,
      created_at: i.created_at,
      inviter_name: r.inviter?.display_name ?? null,
      invitee_name: r.invitee?.display_name ?? null
    };
  });
  const banRows = (bans.data ?? []).map((b) => {
    const p = (b as unknown as { profiles: { display_name: string } | null })
      .profiles;
    return {
      id: b.id,
      user_id: b.user_id,
      banned_until: b.banned_until,
      reason: b.reason,
      created_at: b.created_at,
      user_name: p?.display_name ?? null
    };
  });

  return {
    messages: msgRows,
    invites: inviteRows,
    bans: banRows,
    announcements: announcements.data ?? [],
    totals: {
      messages_24h: countMessages.count ?? 0,
      horn_24h: countHorn.count ?? 0,
      invites_pending: countInvites.count ?? 0,
      active_bans: countBans.count ?? 0
    }
  };
}

/**
 * Owner one-click chat ban: hands the service-role RPC the right args.
 * 24h is the founder's first-step default; the UI can override to 72h
 * for repeat offenders (PRD: 1d -> 3d escalation).
 */
export async function ownerLoungeBan(input: {
  key?: string;
  userId: string;
  hours: 24 | 72;
  reason: string;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const reason = input.reason.trim();
  if (!reason) return { error: 'reason required' };
  if (input.hours !== 24 && input.hours !== 72) {
    return { error: 'hours must be 24 or 72' };
  }
  const { error } = await supabaseAdmin.rpc('club_chat_ban', {
    p_user: input.userId,
    p_hours: input.hours,
    p_reason: reason
  });
  return error ? { error: error.message } : {};
}

/** Pardon a chat ban early (Den → service-role delete). */
export async function ownerLoungePardon(input: {
  key?: string;
  banId: string;
}): Promise<{ error?: string }> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const { error } = await supabaseAdmin
    .from('club_chat_bans')
    .delete()
    .eq('id', input.banId);
  return error ? { error: error.message } : {};
}

/**
 * The Stream Lounge — Lion Den monitor (PRD §10). Reads straight from
 * the Stream server SDK so the owner sees the live transport, not the
 * Supabase mirror. Returns the last few messages per room plus
 * aggregate metrics.
 */
export async function ownerFetchStreamLounge(input: { key?: string }): Promise<{
  rooms?: {
    key: string;
    label: string;
    emoji: string;
    count: number;
    latest: {
      id: string;
      text: string;
      userName: string;
      userId: string;
      horn: boolean;
      createdAt: string;
    }[];
  }[];
  totals?: { messages_24h: number; horns_24h: number };
  error?: string;
}> {
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  if (!streamEnabled()) return { error: 'stream_disabled' };
  const client = getStreamServer();
  const ROOMS = [
    { key: 'global', label: 'The Lounge', emoji: '🌐' },
    { key: 'silver', label: 'Silver', emoji: '🥈' },
    { key: 'gold', label: 'Gold', emoji: '🥇' },
    { key: 'platinum', label: 'Platinum', emoji: '💎' },
    { key: 'diamond', label: 'Diamond', emoji: '🔷' }
  ];
  const dayAgo = new Date(Date.now() - 24 * 3_600_000);
  const rooms = await Promise.all(
    ROOMS.map(async (r) => {
      const ch = client.channel('messaging', `cheeky-${r.key}`);
      let count = 0;
      let latest: {
        id: string;
        text: string;
        userName: string;
        userId: string;
        horn: boolean;
        createdAt: string;
      }[] = [];
      try {
        const state = await (ch as unknown as {
          query: (opts: Record<string, unknown>) => Promise<{
            messages?: Array<{
              id: string;
              text: string;
              user?: { id: string; name?: string };
              custom?: { horn?: boolean; floor?: string };
              created_at?: string;
            }>;
          }>;
        }).query({
          watch: true,
          state: true,
          message_limit: 30,
          presence: false
        });
        const msgs = (state.messages ?? []) as Array<{
          id: string;
          text: string;
          user?: { id: string; name?: string };
          custom?: { horn?: boolean; floor?: string };
          created_at?: string;
        }>;
        const recent = msgs.filter(
          (m) => new Date(m.created_at ?? 0) > dayAgo
        );
        count = recent.length;
        latest = msgs
          .slice(-10)
          .reverse()
          .map((m) => ({
            id: m.id,
            text: m.text,
            userName: m.user?.name ?? 'Member',
            userId: m.user?.id ?? '',
            horn: Boolean(m.custom?.horn),
            createdAt: m.created_at ?? new Date().toISOString()
          }));
      } catch {
        // Channel may not exist yet — fine.
      }
      return { ...r, count, latest };
    })
  );
  const totals = rooms.reduce(
    (acc, r) => {
      acc.messages_24h += r.count;
      acc.horns_24h += r.latest.filter((m) => m.horn).length;
      return acc;
    },
    { messages_24h: 0, horns_24h: 0 }
  );
  return { rooms, totals };
}

/** Stream owner one-click ban. */
export async function ownerStreamBanAction(input: {
  key?: string;
  userId: string;
  reason: string;
  hours: 24 | 72;
}): Promise<{ error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  if (!(await authorized(input.key))) return { error: 'forbidden' };
  const client = getStreamServer() as unknown as {
    banUser: (
      userId: string,
      opts: Record<string, unknown>
    ) => Promise<unknown>;
  };
  await client.banUser(input.userId, {
    banned_by: 'system',
    reason: input.reason,
    timeout: input.hours * 60
  });
  await supabaseAdmin.from('club_chat_bans').insert({
    user_id: input.userId,
    banned_until: new Date(Date.now() + input.hours * 3_600_000).toISOString(),
    reason: input.reason
  });
  return {};
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
