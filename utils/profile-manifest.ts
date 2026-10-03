import 'server-only';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { profileToSection } from '@/utils/top-schema';
import { topPut } from '@/utils/top';

/**
 * The profile-section strangler seam (docs/PRD-user-manifest.md): the
 * profiles/photos tables keep feeding queries, joins, and RLS; the manifest
 * becomes the canonical member view. Called after every profile write —
 * best-effort like the other mirrors: a failed sync never fails the member's
 * save (the table write already succeeded; the coat check falls back to the
 * tables, and the backfill script repairs any drift).
 */
export async function syncProfileToManifest(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const [{ data: profile, error: pErr }, { data: photos, error: phErr }] =
    await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('display_name, one_liner, bio, gender, interested_in, hobbies')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('photos')
        .select('storage_path, is_primary')
        .eq('user_id', userId)
        .order('position', { ascending: true })
    ]);

  if (pErr || phErr) {
    return {
      ok: false,
      error: pErr?.message ?? phErr?.message ?? 'read failed'
    };
  }
  if (!profile) return { ok: false, error: 'no profile row' };

  return topPut(userId, 'profile', profileToSection(profile, photos ?? []));
}
