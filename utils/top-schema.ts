/**
 * The TOP — Top Of Pyramid — schema & geometry (pure, no I/O, no env).
 *
 * docs/PRD-user-manifest.md: THE TOP → USER MANIFEST → SUB-ADDRESSES → DATA.
 * This module is the polytope of the document: types, section validators,
 * window/cap trimming, sub-address resolution, v0 upgrade. Every rule that
 * decides what a legal member document looks like lives here — and nothing
 * here touches storage, the clock (callers pass `now`), or the network, so
 * the whole geometry is unit-testable (tests/top-schema.test.mjs).
 */

// ── types ────────────────────────────────────────────────────────

export const TIERS = ['silver', 'gold', 'platinum', 'diamond'] as const;
export type Tier = (typeof TIERS)[number];

export const MATCH_CHANNELS = [
  'swipe',
  'dance',
  'matchmaker',
  'blind',
  'l3',
  'lounge'
] as const;

export const EVENT_RESULTS = ['matched', 'no-match', 'watched'] as const;

export const SECTION_NAMES = [
  'profile',
  'membership',
  'assets',
  'model',
  'matches',
  'events',
  'meta'
] as const;
export type SectionName = (typeof SECTION_NAMES)[number];

export interface ProfileSection {
  displayName: string;
  oneLiner: string;
  bio: string;
  gender: string;
  interestedIn: string;
  hobbies: string[];
  photos: { path: string; primary: boolean }[];
  showAge: boolean;
  showHeight: boolean;
  showLocation: boolean;
  age: number | null;
  height: string | null;
  location: string | null;
}

export interface MembershipSection {
  tier: Tier;
  verified: boolean;
  verifiedAt: string | null;
  since: string;
  guestPassUntil: string | null;
}

export interface AssetsSection {
  badges: { slug: string; earnedAt: string }[];
  displayBadge: string | null;
  gems: { slug: string; earnedAt: string }[];
  gifts: { slug: string; count: number }[];
  certificates: { kind: string; issuedAt: string }[];
}

export interface ModelSection {
  name: string;
  url: string;
  rig: 'mixamo' | 'none';
  segments: Record<string, string | string[]>;
  palette: Record<string, string>;
  stage: string | null;
  snapshotUrl: string | null;
}

export interface MatchEntry {
  with: string;
  withName: string;
  at: string;
  channel: (typeof MATCH_CHANNELS)[number];
}

export interface MatchesSection {
  windowDays: 30;
  cap: 60;
  history: MatchEntry[];
}

export interface EventEntry {
  kind: string;
  at: string;
  result: (typeof EVENT_RESULTS)[number];
  spent: number;
}

export interface EventsSection {
  windowDays: 30;
  history: EventEntry[];
}

export interface MetaSection {
  persona: string | null;
  storyComplete: boolean;
  streak: number;
  lastCheckin: string | null;
  createdAt: string | null;
}

export interface UserManifest {
  version: 1;
  userId: string;
  updatedAt: string;
  sections: SectionName[];
  profile?: ProfileSection;
  membership?: MembershipSection;
  assets?: AssetsSection;
  model?: ModelSection;
  matches?: MatchesSection;
  events?: EventsSection;
  meta?: MetaSection;
}

export interface MasterEntry {
  path: string;
  version: 1;
  updatedAt: string;
  hasAvatar: boolean;
  sections: SectionName[];
}

export interface MasterManifest {
  version: 1;
  updatedAt: string;
  users: Record<string, MasterEntry>;
}

export const MAX_BYTES = 1_000_000; // bucket cap — a moat, not a budget (~25 KB worst case)
export const MATCH_WINDOW_DAYS = 30;
export const MATCH_CAP = 60; // founder: 2/day — lounge friendships rack up fast
export const EVENT_WINDOW_DAYS = 30;
export const EVENT_CAP = 200;

// ── primitives ───────────────────────────────────────────────────

export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const isStr = (v: unknown): v is string => typeof v === 'string';
const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
const isHttps = (s: string) => s.startsWith('https://') && s.length <= 2048;
const isIso = (s: string) => !Number.isNaN(Date.parse(s));
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type ValidationError = { ok: false; error: string };

const fail = (error: string): ValidationError => ({ ok: false, error });

// ── section validators (uniform field names = uniform address space) ──

export function validateSection(
  name: SectionName,
  data: unknown
): { ok: true; section: unknown } | { ok: false; error: string } {
  if (!isObj(data)) return fail(`${name} must be an object`);
  const d = data;

  switch (name) {
    case 'profile': {
      if (
        !isStr(d.displayName) ||
        d.displayName.length < 1 ||
        d.displayName.length > 80
      )
        return fail('profile.displayName must be 1–80 characters');
      if (!isStr(d.oneLiner) || d.oneLiner.length > 140)
        return fail('profile.oneLiner must be ≤140 characters');
      if (!isStr(d.bio) || d.bio.length > 2000)
        return fail('profile.bio must be ≤2000 characters');
      if (!isStr(d.gender) || d.gender.length > 40)
        return fail('profile.gender must be a short string');
      if (!isStr(d.interestedIn) || d.interestedIn.length > 40)
        return fail('profile.interestedIn must be a short string');
      if (
        !Array.isArray(d.hobbies) ||
        d.hobbies.length > 12 ||
        !d.hobbies.every((h) => isStr(h) && h.length <= 40)
      )
        return fail('profile.hobbies must be ≤12 short slugs');
      if (!Array.isArray(d.photos) || d.photos.length > 8)
        return fail('profile.photos must be ≤8 entries');
      for (const p of d.photos as unknown[]) {
        if (
          !isObj(p) ||
          !isStr(p.path) ||
          p.path.length > 300 ||
          typeof p.primary !== 'boolean'
        )
          return fail('profile.photos entries need {path, primary}');
      }
      for (const flag of ['showAge', 'showHeight', 'showLocation'])
        if (typeof d[flag] !== 'boolean')
          return fail(`profile.${flag} must be a boolean`);
      if (d.age != null) {
        if (typeof d.age !== 'number' || !Number.isInteger(d.age))
          return fail('profile.age must be an integer');
        // the front door is 18+; a manifest cannot carry a minor's age
        if (d.age < 18 || d.age > 120)
          return fail('profile.age must be 18–120');
      }
      for (const s of ['height', 'location'] as const)
        if (d[s] != null && (!isStr(d[s]) || (d[s] as string).length > 80))
          return fail(`profile.${s} must be null or a short string`);
      break;
    }
    case 'membership': {
      if (!TIERS.includes(d.tier as Tier))
        return fail('membership.tier invalid');
      if (typeof d.verified !== 'boolean')
        return fail('membership.verified must be a boolean');
      if (
        d.verifiedAt != null &&
        (!isStr(d.verifiedAt) || !isIso(d.verifiedAt))
      )
        return fail('membership.verifiedAt must be ISO or null');
      if (!isStr(d.since) || !isIso(d.since))
        return fail('membership.since must be ISO');
      if (
        d.guestPassUntil != null &&
        (!isStr(d.guestPassUntil) || !isIso(d.guestPassUntil))
      )
        return fail('membership.guestPassUntil must be ISO or null');
      break;
    }
    case 'assets': {
      for (const list of ['badges', 'gems'] as const) {
        if (!Array.isArray(d[list]) || d[list].length > 100)
          return fail(`assets.${list} must be a list of ≤100`);
        for (const e of d[list] as unknown[])
          if (
            !isObj(e) ||
            !isStr(e.slug) ||
            !isStr(e.earnedAt) ||
            !isIso(e.earnedAt)
          )
            return fail(`assets.${list} entries need {slug, earnedAt}`);
      }
      if (d.displayBadge != null && !isStr(d.displayBadge))
        return fail('assets.displayBadge must be a slug or null');
      if (!Array.isArray(d.gifts) || d.gifts.length > 60)
        return fail('assets.gifts must be a list of ≤60');
      for (const g of d.gifts as unknown[])
        if (
          !isObj(g) ||
          !isStr(g.slug) ||
          typeof g.count !== 'number' ||
          g.count < 0
        )
          return fail('assets.gifts entries need {slug, count}');
      if (!Array.isArray(d.certificates) || d.certificates.length > 100)
        return fail('assets.certificates must be a list of ≤100');
      for (const c of d.certificates as unknown[])
        if (
          !isObj(c) ||
          !isStr(c.kind) ||
          !isStr(c.issuedAt) ||
          !isIso(c.issuedAt)
        )
          return fail('assets.certificates entries need {kind, issuedAt}');
      break;
    }
    case 'model': {
      if (!isStr(d.name) || d.name.length < 1 || d.name.length > 80)
        return fail('model.name must be 1–80 characters');
      if (!isStr(d.url) || !isHttps(d.url))
        return fail('model.url must be an https URL');
      if (d.rig !== 'mixamo' && d.rig !== 'none')
        return fail("model.rig must be 'mixamo' or 'none'");
      if (!isObj(d.segments)) return fail('model.segments must be an object');
      const segKeys = Object.keys(d.segments);
      if (segKeys.length > 24) return fail('model.segments has too many slots');
      for (const k of segKeys) {
        const v = d.segments[k];
        if (isStr(v) && v.length <= 160) continue;
        if (
          Array.isArray(v) &&
          v.length <= 24 &&
          v.every((s) => isStr(s) && s.length <= 160)
        )
          continue;
        return fail(`model.segments.${k} must be a slug or list of slugs`);
      }
      if (!isObj(d.palette)) return fail('model.palette must be an object');
      const palKeys = Object.keys(d.palette);
      if (palKeys.length > 12) return fail('model.palette has too many slots');
      for (const k of palKeys)
        if (!isHex(d.palette[k] as string))
          return fail(`model.palette.${k} must be #rrggbb`);
      if (d.stage !== null && (!isStr(d.stage) || d.stage.length > 160))
        return fail('model.stage must be null or a short string');
      if (
        d.snapshotUrl !== null &&
        (!isStr(d.snapshotUrl) || !isHttps(d.snapshotUrl))
      )
        return fail('model.snapshotUrl must be an https URL or null');
      break;
    }
    case 'matches': {
      if (d.windowDays !== MATCH_WINDOW_DAYS || d.cap !== MATCH_CAP)
        return fail(
          `matches window/cap are fixed at ${MATCH_WINDOW_DAYS}d/${MATCH_CAP}`
        );
      if (!Array.isArray(d.history) || d.history.length > MATCH_CAP)
        return fail(`matches.history must be a list of ≤${MATCH_CAP}`);
      for (const e of d.history as unknown[]) {
        if (!isObj(e) || !isStr(e.with) || !isUuid(e.with))
          return fail('matches entries need a uuid "with"');
        if (!isStr(e.withName) || e.withName.length > 80)
          return fail('matches.withName must be ≤80 characters');
        if (!isStr(e.at) || !isIso(e.at)) return fail('matches.at must be ISO');
        if (
          !MATCH_CHANNELS.includes(e.channel as (typeof MATCH_CHANNELS)[number])
        )
          return fail('matches.channel invalid');
      }
      break;
    }
    case 'events': {
      if (d.windowDays !== EVENT_WINDOW_DAYS)
        return fail(`events.windowDays is fixed at ${EVENT_WINDOW_DAYS}`);
      if (!Array.isArray(d.history) || d.history.length > EVENT_CAP)
        return fail(`events.history must be a list of ≤${EVENT_CAP}`);
      for (const e of d.history as unknown[]) {
        if (
          !isObj(e) ||
          !isStr(e.kind) ||
          e.kind.length > 60 ||
          !isStr(e.at) ||
          !isIso(e.at) ||
          !EVENT_RESULTS.includes(e.result as (typeof EVENT_RESULTS)[number]) ||
          typeof e.spent !== 'number' ||
          e.spent < 0
        )
          return fail('events entries need {kind, at, result, spent}');
      }
      break;
    }
    case 'meta': {
      if (d.persona !== null && (!isStr(d.persona) || d.persona.length > 60))
        return fail('meta.persona must be a short slug or null');
      if (typeof d.storyComplete !== 'boolean')
        return fail('meta.storyComplete must be a boolean');
      if (
        typeof d.streak !== 'number' ||
        !Number.isInteger(d.streak) ||
        d.streak < 0
      )
        return fail('meta.streak must be a non-negative integer');
      for (const s of ['lastCheckin', 'createdAt'] as const)
        if (d[s] != null && (!isStr(d[s]) || !isIso(d[s])))
          return fail(`meta.${s} must be ISO or null`);
      break;
    }
  }
  return { ok: true, section: data };
}

// ── whole-document validation + v0 upgrade ───────────────────────

export interface AvatarContractV0 {
  version: 0;
  userId: string;
  updatedAt: string;
  name: string;
  model: { url: string; rig: 'mixamo' | 'none' } | null;
  segments: Record<string, string | string[]>;
  palette: Record<string, string>;
  stage: string | null;
  card: { snapshotUrl?: string | null; displayBadge?: string | null };
}

/** The maker's v0 avatar contract folds into v1's model + assets sections. */
export function upgradeV0(v0: AvatarContractV0): ModelSection & {
  displayBadge: string | null;
} {
  return {
    name: v0.name,
    url: v0.model?.url ?? '',
    rig: v0.model?.rig ?? 'none',
    segments: v0.segments,
    palette: v0.palette,
    stage: v0.stage,
    snapshotUrl: v0.card.snapshotUrl ?? null,
    displayBadge: v0.card.displayBadge ?? null
  };
}

export function validateManifest(
  raw: unknown,
  userId: string
): { ok: true; manifest: UserManifest } | { ok: false; error: string } {
  if (!isObj(raw)) return fail('manifest must be an object');
  if (raw.userId !== userId) return fail('userId mismatch'); // the uuid cross-check
  if (!isStr(raw.updatedAt) || !isIso(raw.updatedAt))
    return fail('updatedAt must be ISO');

  if (raw.version === 0) {
    const m = emptyManifest(userId, raw.updatedAt);
    const v0 = raw as unknown as AvatarContractV0;
    if (!isStr(v0.name) || v0.name.length < 1 || v0.name.length > 80)
      return fail('name must be 1–80 characters');
    if (
      v0.model !== null &&
      (!isObj(v0.model) || !isStr(v0.model.url) || !isHttps(v0.model.url))
    )
      return fail('model.url must be an https URL');
    const model: ModelSection = {
      name: v0.name,
      url: v0.model?.url ?? '',
      rig: v0.model?.rig ?? 'none',
      segments: isObj(v0.segments) ? v0.segments : {},
      palette: isObj(v0.palette) ? v0.palette : {},
      stage: isStr(v0.stage) ? v0.stage : null,
      snapshotUrl: isStr(v0.card?.snapshotUrl) ? v0.card.snapshotUrl : null
    };
    if (model.url !== '' && !isHttps(model.url))
      return fail('model.url must be an https URL');
    m.model = model;
    m.sections.push('model');
    if (isStr(v0.card?.displayBadge)) {
      m.assets = {
        badges: [],
        displayBadge: v0.card.displayBadge,
        gems: [],
        gifts: [],
        certificates: []
      };
      m.sections.push('assets');
    }
    return sizeCheck(m);
  }

  if (raw.version !== 1) return fail('unsupported manifest version');
  if (
    !Array.isArray(raw.sections) ||
    !raw.sections.every((s) => SECTION_NAMES.includes(s))
  )
    return fail('sections must be a list of known section names');
  const m = raw as unknown as UserManifest;
  for (const s of m.sections) {
    const checked = validateSection(s, m[s]);
    if (!checked.ok) return checked;
  }
  return sizeCheck(m);
}

export function emptyManifest(userId: string, updatedAt: string): UserManifest {
  return { version: 1, userId, updatedAt, sections: [] };
}

export function sizeCheck(
  m: UserManifest
): { ok: true; manifest: UserManifest } | { ok: false; error: string } {
  if (JSON.stringify(m).length > MAX_BYTES)
    return fail('manifest exceeds 1 MB');
  return { ok: true, manifest: m };
}

// ── profile mapping (pure — shared by the live sync and the backfill) ──

export interface ProfileRowLike {
  display_name: string | null;
  one_liner: string | null;
  bio: string | null;
  gender: string | null;
  interested_in: string | null;
  hobbies: string[] | null;
}

export interface PhotoRowLike {
  storage_path: string | null;
  is_primary: boolean | null;
}

/**
 * Table rows → manifest profile section. The show-flags default OFF (privacy
 * first — a member opts in when the form grows those fields); age/height/
 * location stay null until then. Photos: primary first, ≤8, pathless rows
 * dropped.
 */
export function profileToSection(
  profile: ProfileRowLike,
  photos: PhotoRowLike[]
): ProfileSection {
  const mapped = photos
    .filter(
      (p) => typeof p.storage_path === 'string' && p.storage_path.length > 0
    )
    .slice(0, 8)
    .map((p) => ({
      path: p.storage_path as string,
      primary: p.is_primary === true
    }));
  const flagged = mapped.some((p) => p.primary)
    ? mapped
    : mapped.map((p, i) => (i === 0 ? { ...p, primary: true } : p));
  // primary first, remaining photos keep their position order
  const sorted = [
    ...flagged.filter((p) => p.primary),
    ...flagged.filter((p) => !p.primary)
  ];

  return {
    displayName: profile.display_name ?? 'Member',
    oneLiner: profile.one_liner ?? '',
    bio: profile.bio ?? '',
    gender: profile.gender ?? 'unspecified',
    interestedIn: profile.interested_in ?? 'everyone',
    hobbies: (profile.hobbies ?? []).slice(0, 12),
    photos: sorted,
    showAge: false,
    showHeight: false,
    showLocation: false,
    age: null,
    height: null,
    location: null
  };
}

/**
 * Table/RPC truth → manifest membership section. Pure.
 * current_tier() answers 'standard' for the free floor — normalized to
 * 'silver' here so the manifest speaks the UI's vocabulary. Anything
 * unrecognized falls to 'silver' (the door every member starts behind).
 */
export function membershipToSection(input: {
  tier: string;
  verifiedAt: string | null;
  since: string;
  guestPassUntil: string | null;
}): MembershipSection {
  const tier = input.tier === 'standard' ? 'silver' : input.tier;
  return {
    tier: (TIERS as readonly string[]).includes(tier)
      ? (tier as Tier)
      : 'silver',
    verified: input.verifiedAt !== null,
    verifiedAt: input.verifiedAt,
    since: input.since,
    guestPassUntil: input.guestPassUntil
  };
}

// ── window/cap trimming (callers pass `now` — pure, testable) ────

const DAY_MS = 86_400_000;

export function trimMatches(
  history: MatchEntry[],
  nowMs: number
): MatchEntry[] {
  const cutoff = nowMs - MATCH_WINDOW_DAYS * DAY_MS;
  return history
    .filter((e) => Date.parse(e.at) >= cutoff)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MATCH_CAP);
}

export function trimEvents(history: EventEntry[], nowMs: number): EventEntry[] {
  const cutoff = nowMs - EVENT_WINDOW_DAYS * DAY_MS;
  return history
    .filter((e) => Date.parse(e.at) >= cutoff)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, EVENT_CAP);
}

// ── sub-addresses (THE TOP's addressing scheme) ──────────────────

/**
 * Resolve a dotted sub-address ('profile.photos', 'model.snapshotUrl')
 * against a manifest. Only one level deep (section.field) — the address
 * space is flat by doctrine; data below a field is opaque payload.
 */
export function resolveSubaddress(
  m: UserManifest,
  path: string
): { found: boolean; value?: unknown } {
  const [section, field] = path.split('.');
  if (!SECTION_NAMES.includes(section as SectionName)) return { found: false };
  const data = m[section as SectionName] as Record<string, unknown> | undefined;
  if (data == null) return { found: false };
  if (field === undefined) return { found: true, value: data };
  if (!(field in data)) return { found: false };
  return { found: true, value: data[field] };
}

export function projectFields(
  m: UserManifest,
  fields: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const r = resolveSubaddress(m, f);
    if (r.found) out[f] = r.value;
  }
  return out;
}

// ── master directory entry ───────────────────────────────────────

export function buildMasterEntry(m: UserManifest): MasterEntry {
  return {
    path: `${m.userId}/manifest.json`,
    version: 1,
    updatedAt: m.updatedAt,
    hasAvatar: m.model !== undefined && m.model.url !== '',
    sections: m.sections
  };
}
