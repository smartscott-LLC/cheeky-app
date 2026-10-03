import 'server-only';
import {
  buildMasterEntry,
  emptyManifest,
  type EventEntry,
  type MatchEntry,
  type MasterManifest,
  resolveSubaddress,
  type SectionName,
  trimEvents,
  trimMatches,
  type UserManifest,
  validateManifest,
  validateSection
} from './top-schema';
import { supabaseServiceKey, supabaseUrl } from '@/utils/supabase/keys';

/**
 * THE TOP — Top Of Pyramid — control plane (docs/PRD-user-manifest.md).
 *
 * Directory + router over member manifests. Consumers address members by
 * sub-address ('profile.photos', 'model.snapshotUrl'); storage (the private
 * user-manifests bucket), the TTL cache, the _master.json directory, and the
 * uuid cross-check all hide behind this interface. If the directory ever
 * gets hot it graduates to an RPC/KV and nobody downstream notices — the
 * seam is the design.
 *
 * The geometry (validators, trims, resolution) is pure in utils/top-schema;
 * this module is the only place that touches the network.
 */

const BUCKET = 'user-manifests';
const CACHE_TTL_MS = 30_000;

const headers = {
  apikey: supabaseServiceKey,
  Authorization: `Bearer ${supabaseServiceKey}`
};

async function storageGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    headers
  });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

async function storagePut(path: string, body: unknown): Promise<boolean> {
  const r = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'x-upsert': 'true'
    },
    body: JSON.stringify(body)
  });
  return r.ok;
}

// ── directory-backed reads (TTL cache) ───────────────────────────

const cache = new Map<string, { m: UserManifest | null; at: number }>();

/** Full member document, v0 transparently upgraded to v1. Null if none. */
export async function readFull(userId: string): Promise<UserManifest | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.m;
  const raw = await storageGet<unknown>(`${userId}/manifest.json`);
  let m: UserManifest | null = null;
  if (raw) {
    const checked = validateManifest(raw, userId);
    m = checked.ok ? checked.manifest : null;
  }
  cache.set(userId, { m, at: Date.now() });
  return m;
}

/**
 * THE TOP's read: resolve sub-addresses against a member's document.
 * Missing sections resolve to absent keys (sectionFlags in the directory
 * tell callers what exists without fetching).
 */
export async function topGet(
  userId: string,
  fields: string[]
): Promise<Record<string, unknown>> {
  const m = await readFull(userId);
  const out: Record<string, unknown> = {};
  if (!m) return out;
  for (const f of fields) {
    const r = resolveSubaddress(m, f);
    if (r.found) out[f] = r.value;
  }
  return out;
}

export async function readMaster(): Promise<MasterManifest | null> {
  return storageGet<MasterManifest>('_master.json');
}

// ── writes (every one validates, then updates the directory) ─────

async function commit(
  m: UserManifest
): Promise<{ ok: boolean; error?: string }> {
  const wrote = await storagePut(`${m.userId}/manifest.json`, m);
  if (!wrote) return { ok: false, error: 'manifest write failed' };

  // Directory: read-modify-write. Last-write-wins is fine at this scale;
  // the upgrade path (RPC/KV) hides behind this same function.
  const master: MasterManifest = (await readMaster()) ?? {
    version: 1,
    updatedAt: m.updatedAt,
    users: {}
  };
  master.users[m.userId] = buildMasterEntry(m);
  master.updatedAt = new Date().toISOString();
  const wroteMaster = await storagePut('_master.json', master);
  if (!wroteMaster)
    return { ok: false, error: 'master directory write failed' };

  cache.delete(m.userId);
  return { ok: true };
}

/** Replace one section wholesale (the writer owns its section's truth). */
export async function topPut(
  userId: string,
  section: SectionName,
  data: unknown
): Promise<{ ok: boolean; error?: string }> {
  const checked = validateSection(section, data);
  if (!checked.ok) return { ok: false, error: checked.error };

  const now = new Date().toISOString();
  const m: UserManifest =
    (await readFull(userId)) ?? emptyManifest(userId, now);
  Object.assign(m, { [section]: checked.section });
  if (!m.sections.includes(section)) m.sections.push(section);
  m.updatedAt = now;

  const sized = validateManifest({ ...m, updatedAt: now }, userId);
  if (!sized.ok) return { ok: false, error: sized.error };
  return commit(sized.manifest);
}

/** Append a match to both members' views (called by the matches module's door). */
export async function addMatch(
  userId: string,
  entry: MatchEntry
): Promise<{ ok: boolean; error?: string }> {
  const nowMs = Date.now();
  const m =
    (await readFull(userId)) ??
    emptyManifest(userId, new Date(nowMs).toISOString());
  const history = trimMatches([...(m.matches?.history ?? []), entry], nowMs);
  return topPut(userId, 'matches', { windowDays: 30, cap: 60, history });
}

/** Append an event settlement (called by the events engine's door). */
export async function addEvent(
  userId: string,
  entry: EventEntry
): Promise<{ ok: boolean; error?: string }> {
  const nowMs = Date.now();
  const m =
    (await readFull(userId)) ??
    emptyManifest(userId, new Date(nowMs).toISOString());
  const history = trimEvents([...(m.events?.history ?? []), entry], nowMs);
  return topPut(userId, 'events', { windowDays: 30, history });
}

/**
 * The maker's save door: accepts the v0 avatar contract (PRD-avatar-maker),
 * folds it into v1's model section, and carries card.displayBadge into
 * assets if present. One door, one vocabulary.
 */
export async function saveAvatar(
  userId: string,
  v0: unknown
): Promise<{ ok: boolean; error?: string }> {
  const checked = validateManifest(v0, userId); // v0 path upgrades + validates
  if (!checked.ok) return { ok: false, error: checked.error };
  const { model, assets } = checked.manifest;
  if (!model) return { ok: false, error: 'model section missing' };

  const wroteModel = await topPut(userId, 'model', model);
  if (!wroteModel.ok) return wroteModel;

  if (assets) {
    const current = await readFull(userId);
    const merged = {
      badges: current?.assets?.badges ?? [],
      displayBadge: assets.displayBadge,
      gems: current?.assets?.gems ?? [],
      gifts: current?.assets?.gifts ?? [],
      certificates: current?.assets?.certificates ?? []
    };
    const wroteAssets = await topPut(userId, 'assets', merged);
    if (!wroteAssets.ok) return wroteAssets;
  }
  return { ok: true };
}
