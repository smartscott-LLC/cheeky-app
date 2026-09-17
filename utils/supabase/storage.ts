const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';
const BUCKET = 'quest-avatars';

/**
 * Upload an image from a URL to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToSupabase(
  remoteUrl: string,
  fileName: string
): Promise<string> {
  // Download the image
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const mimeType = res.headers.get('content-type') || 'image/png';

  // Upload to Supabase Storage
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`,
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

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Supabase upload failed: ${err}`);
  }

  // Return public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

/**
 * Get the public URL for a quest avatar by ID.
 */
export function avatarUrl(avatarId: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${avatarId}.webp`;
}
