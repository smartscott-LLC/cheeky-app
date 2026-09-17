const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';
const BUCKET = 'quest-avatars';

/**
 * Full user manifest — one source of truth for all user assets.
 * Everything lives here: bio, pics, avatars, inventory, quest data.
 */
export interface QuestAsset {
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  tags?: string[];
}

export interface QuestManifest {
  userId: string;

  // Profile basics
  name?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';

  // Dating profile details
  age?: number;
  height?: string;
  hometown?: string;
  state?: string;
  smoker?: boolean;
  drinker?: boolean;
  interests?: string[];

  // Photos (profile pics, etc.)
  photos: Record<string, QuestAsset>;

  // Quest avatar pipeline
  avatarPhoto?: QuestAsset; // uploaded reference photo
  avatarImage?: QuestAsset; // generated portrait
  avatarVideo?: QuestAsset; // 360° spin video
  avatarModel?: QuestAsset; // 3D model (.glb)
  avatarMeta?: {
    name?: string;
    rpgClass?: string;
    generationType?: 'manual' | 'ai';
    config?: Record<string, unknown>;
  };

  // Inventory & collectibles
  inventory: Record<string, QuestAsset>;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/** Build the storage URL for any user asset. */
export function assetUrl(userId: string, filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${userId}/${filename}`;
}

/** Build the manifest URL for a user. */
export function manifestUrl(userId: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${userId}/manifest.json`;
}

/** Download a remote file and return as ArrayBuffer. */
export async function downloadBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return res.arrayBuffer();
}

/** Upload a buffer to a user's folder in Supabase Storage. */
export async function uploadAsset(
  userId: string,
  filename: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${userId}/${filename}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'true'
      },
      body: buffer
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }
  return assetUrl(userId, filename);
}

/** Read JSON from a user's manifest in storage. */
export async function loadManifest(userId: string): Promise<QuestManifest> {
  try {
    const res = await fetch(manifestUrl(userId));
    if (res.ok) {
      const data = (await res.json()) as QuestManifest;
      if (data.userId) return data;
    }
  } catch {}

  // Create fresh manifest
  const now = new Date().toISOString();
  const fresh: QuestManifest = {
    userId,
    photos: {},
    inventory: {},
    createdAt: now,
    updatedAt: now
  };
  await saveManifest(userId, fresh);
  return fresh;
}

/** Write the full manifest back to storage. */
export async function saveManifest(
  userId: string,
  manifest: QuestManifest
): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  const buffer = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${userId}/manifest.json`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true'
      },
      body: buffer
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Manifest save failed: ${err}`);
  }
}

/** Get a single asset from the manifest. */
export async function getAsset(
  userId: string,
  key: string
): Promise<QuestAsset | null> {
  const manifest = await loadManifest(userId);
  return manifest.photos[key] || manifest.inventory[key] || null;
}

/** Add/update a photo in the manifest. */
export async function setPhoto(
  userId: string,
  key: string,
  url: string,
  meta: Partial<QuestAsset> = {}
): Promise<QuestManifest> {
  const manifest = await loadManifest(userId);
  manifest.photos[key] = {
    url,
    uploadedAt: new Date().toISOString(),
    ...meta
  };
  await saveManifest(userId, manifest);
  return manifest;
}

/** Add/update an inventory item in the manifest. */
export async function setInventory(
  userId: string,
  key: string,
  url: string,
  meta: Partial<QuestAsset> = {}
): Promise<QuestManifest> {
  const manifest = await loadManifest(userId);
  manifest.inventory[key] = {
    url,
    uploadedAt: new Date().toISOString(),
    ...meta
  };
  await saveManifest(userId, manifest);
  return manifest;
}

/** Set quest avatar pipeline state. */
export async function setAvatar(
  userId: string,
  stage: 'photo' | 'image' | 'video' | 'model',
  url: string,
  meta?: Partial<QuestAsset>
): Promise<QuestManifest> {
  const manifest = await loadManifest(userId);
  const field =
    stage === 'photo'
      ? 'avatarPhoto'
      : stage === 'image'
        ? 'avatarImage'
        : stage === 'video'
          ? 'avatarVideo'
          : 'avatarModel';
  (manifest as any)[field] = {
    url,
    mimeType: meta?.mimeType,
    uploadedAt: new Date().toISOString(),
    tags: meta?.tags
  };
  await saveManifest(userId, manifest);
  return manifest;
}

/** Update quest avatar metadata (name, class, config). */
export async function setAvatarMeta(
  userId: string,
  meta: QuestManifest['avatarMeta']
): Promise<QuestManifest> {
  const manifest = await loadManifest(userId);
  manifest.avatarMeta = { ...manifest.avatarMeta, ...meta };
  await saveManifest(userId, manifest);
  return manifest;
}

/** Update profile fields. */
export async function setProfile(
  userId: string,
  updates: Partial<Pick<QuestManifest, 'name' | 'bio' | 'gender'>>
): Promise<QuestManifest> {
  const manifest = await loadManifest(userId);
  Object.assign(manifest, updates);
  await saveManifest(userId, manifest);
  return manifest;
}

/** Fetch a user's full manifest (for HUD, profile, etc.). */
export async function getManifest(userId: string): Promise<QuestManifest> {
  return loadManifest(userId);
}
