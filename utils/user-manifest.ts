import 'server-only';
import { supabaseServiceKey, supabaseUrl } from '@/utils/supabase/keys';

/**
 * The user-manifest substrate — docs/PRD-avatar-maker.md contract v0.
 *
 * One private JSON per member at user-manifests/{userId}/manifest.json, plus
 * a master index (_master.json) that points at every member's manifest.
 * All per-user data is written and read here — this is the substrate the
 * vector-DB phase will graduate from. Server-side only: clients go through
 * the /api/avatar/* doors, never raw Storage.
 */

const BUCKET = 'user-manifests';
const MAX_BYTES = 1_000_000; // bucket cap — a manifest is data, not media
const CACHE_TTL_MS = 30_000;

export interface AvatarModel {
  url: string;
  rig: 'mixamo' | 'none';
}

export interface AvatarManifest {
  version: 0;
  userId: string;
  updatedAt: string;
  name: string;
  model: AvatarModel | null;
  segments: Record<string, string | string[]>;
  palette: Record<string, string>;
  stage: string | null;
  card: {
    snapshotUrl?: string | null;
    displayBadge?: string | null;
  };
}

export interface MasterEntry {
  path: string;
  updatedAt: string;
  hasAvatar: boolean;
}

export interface MasterManifest {
  version: 0;
  updatedAt: string;
  users: Record<string, MasterEntry>;
}

// ── validation ───────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
const isHttps = (s: string) => s.startsWith('https://') && s.length <= 2048;
const isIso = (s: string) => !Number.isNaN(Date.parse(s));

export function validateManifest(
  raw: unknown,
  userId: string
): { ok: true; manifest: AvatarManifest } | { ok: false; error: string } {
  if (!isObj(raw)) return { ok: false, error: 'manifest must be an object' };
  if (raw.version !== 0) return { ok: false, error: 'unsupported manifest version' };
  if (raw.userId !== userId) return { ok: false, error: 'userId mismatch' };
  if (!isStr(raw.updatedAt) || !isIso(raw.updatedAt))
    return { ok: false, error: 'updatedAt must be an ISO timestamp' };
  if (!isStr(raw.name) || raw.name.length < 1 || raw.name.length > 80)
    return { ok: false, error: 'name must be 1–80 characters' };

  if (raw.model !== null) {
    if (!isObj(raw.model) || !isStr(raw.model.url) || !isHttps(raw.model.url))
      return { ok: false, error: 'model.url must be an https URL' };
    if (raw.model.rig !== 'mixamo' && raw.model.rig !== 'none')
      return { ok: false, error: "model.rig must be 'mixamo' or 'none'" };
  }

  if (!isObj(raw.segments))
    return { ok: false, error: 'segments must be an object' };
  const segKeys = Object.keys(raw.segments);
  if (segKeys.length > 24) return { ok: false, error: 'too many segment slots' };
  for (const k of segKeys) {
    const v = raw.segments[k];
    if (isStr(v) && v.length <= 160) continue;
    if (Array.isArray(v) && v.length <= 24 && v.every(s => isStr(s) && s.length <= 160))
      continue;
    return { ok: false, error: `segment '${k}' must be a slug or list of slugs` };
  }

  if (!isObj(raw.palette)) return { ok: false, error: 'palette must be an object' };
  const palKeys = Object.keys(raw.palette);
  if (palKeys.length > 12) return { ok: false, error: 'too many palette slots' };
  for (const k of palKeys) {
    if (!isHex(raw.palette[k] as string))
      return { ok: false, error: `palette.${k} must be #rrggbb` };
  }

  if (raw.stage !== null && (!isStr(raw.stage) || raw.stage.length > 160))
    return { ok: false, error: 'stage must be null or a short string' };

  if (!isObj(raw.card)) return { ok: false, error: 'card must be an object' };
  if (raw.card.snapshotUrl != null && !isHttps(raw.card.snapshotUrl as string))
    return { ok: false, error: 'card.snapshotUrl must be an https URL' };
  if (raw.card.displayBadge != null && !isStr(raw.card.displayBadge))
    return { ok: false, error: 'card.displayBadge must be a slug string' };

  const manifest = raw as unknown as AvatarManifest;
  if (JSON.stringify(manifest).length > MAX_BYTES)
    return { ok: false, error: 'manifest exceeds 1 MB' };
  return { ok: true, manifest };
}

// ── storage access (service key; bucket is private) ──────────────

const headers = {
  apikey: supabaseServiceKey,
  Authorization: `Bearer ${supabaseServiceKey}`,
  'Content-Type': 'application/json'
};

async function storageGet<T>(path: string): Promise<T | null> {
  const r = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`,
    { headers: { apikey: supabaseServiceKey, Authorization: headers.Authorization } }
  );
  if (!r.ok) return null;
  return (await r.json()) as T;
}

async function storagePut(path: string, body: unknown): Promise<boolean> {
  const r = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'PUT',
    headers: { ...headers, 'x-upsert': 'true' },
    body: JSON.stringify(body)
  });
  return r.ok;
}

// ── read (tiny TTL cache — the master-index pattern keeps hits cheap) ──

const cache = new Map<string, { m: AvatarManifest | null; at: number }>();

export async function readManifest(
  userId: string
): Promise<AvatarManifest | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.m;
  const m = await storageGet<AvatarManifest>(`${userId}/manifest.json`);
  cache.set(userId, { m, at: Date.now() });
  return m;
}

export async function readMaster(): Promise<MasterManifest | null> {
  return storageGet<MasterManifest>('_master.json');
}

// ── write (user object first, then master index) ─────────────────

export async function saveManifest(
  userId: string,
  manifest: AvatarManifest
): Promise<{ ok: boolean; error?: string }> {
  const wrote = await storagePut(`${userId}/manifest.json`, manifest);
  if (!wrote) return { ok: false, error: 'manifest write failed' };

  // Master index: read-modify-write. Last-write-wins is fine at this scale;
  // if contention ever shows up it graduates to a SECURITY DEFINER RPC.
  const master = (await readMaster()) ?? {
    version: 0 as const,
    updatedAt: manifest.updatedAt,
    users: {}
  };
  master.users[userId] = {
    path: `${userId}/manifest.json`,
    updatedAt: manifest.updatedAt,
    hasAvatar: manifest.model !== null
  };
  master.updatedAt = new Date().toISOString();
  const wroteMaster = await storagePut('_master.json', master);
  if (!wroteMaster) return { ok: false, error: 'master index write failed' };

  cache.delete(userId);
  return { ok: true };
}
