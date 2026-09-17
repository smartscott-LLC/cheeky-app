const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const BUCKET = 'quest-avatars';

/**
 * Build the full storage URL for a user asset.
 */
export function userAssetUrl(userId: string, filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${userId}/${filename}`;
}

/**
 * Build the manifest URL for a user.
 */
export function userManifestUrl(userId: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${userId}/manifest.json`;
}

/**
 * Upload a file to Supabase Storage in a user's folder.
 */
export async function uploadToUserFolder(
  userId: string,
  filename: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const path = `${userId}/${filename}`;
  
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  return userAssetUrl(userId, filename);
}

/**
 * Read a JSON file from Supabase Storage.
 */
export async function readJsonFromStorage<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

/**
 * Write a JSON file to Supabase Storage.
 */
export async function writeJsonToStorage(
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const buffer = new TextEncoder().encode(JSON.stringify(data, null, 2));
  
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${userId}/manifest.json`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Manifest write failed: ${err}`);
  }
}

/**
 * Load or create a user manifest.
 */
export interface QuestManifest {
  userId: string;
  photo?: string;
  avatar?: string;
  video?: string;
  model3d?: string;
  createdAt: string;
  updatedAt: string;
}

export async function loadUserManifest(userId: string): Promise<QuestManifest> {
  const existing = await readJsonFromStorage<QuestManifest>(userManifestUrl(userId));
  if (existing) return existing;
  
  const newManifest: QuestManifest = {
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeJsonToStorage(userId, newManifest);
  return newManifest;
}

/**
 * Update a field in the user manifest.
 */
export async function updateManifestField(
  userId: string,
  field: keyof QuestManifest,
  value: string
): Promise<QuestManifest> {
  const manifest = await loadUserManifest(userId);
  (manifest as any)[field] = value;
  manifest.updatedAt = new Date().toISOString();
  await writeJsonToStorage(userId, manifest as any);
  return manifest;
}
