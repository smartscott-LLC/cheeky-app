'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function updateProfile(
  displayName: string,
  bio: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim().slice(0, 50),
      bio: bio.trim().slice(0, 500)
    })
    .eq('id', user.id);

  if (error) {
    console.error('updateProfile failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/**
 * Profile photo upload — server-side (robust session, size + type checks,
 * RLS-clean). Receives the file via FormData.
 */
export async function uploadProfilePhoto(
  formData: FormData
): Promise<{ error?: string; id?: string; storagePath?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'not signed in' };
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return { error: 'no file' };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'file too large (10MB max)' };
    }
    if (!file.type.startsWith('image/')) {
      return { error: 'unsupported format — use an image (JPG, PNG, WebP)' };
    }

    const position = Number(formData.get('position') ?? 0);
    const isFirst = formData.get('isFirst') === 'true';

    const storagePath = `${user.id}/${crypto.randomUUID()}`;
    const { error: upErr } = await supabase.storage
      .from('profiles')
      .upload(storagePath, file);
    if (upErr) {
      console.error('photo upload failed:', upErr.message);
      return { error: upErr.message };
    }

    const { data, error: insErr } = await supabase
      .from('photos')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        position,
        is_primary: isFirst
      })
      .select('id')
      .single();

    if (insErr) {
      await supabase.storage.from('profiles').remove([storagePath]);
      console.error('photo row insert failed:', insErr.message);
      return { error: insErr.message };
    }

    return { id: data.id, storagePath };
  } catch (err) {
    console.error('uploadProfilePhoto threw:', err);
    return {
      error: 'upload failed — please try again (if it persists, try a JPG)'
    };
  }
}

/** Deletes a photo row + its storage object (owner only, server-side). */
export async function deleteProfilePhoto(
  photoId: string,
  storagePath: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    await supabase.from('photos').delete().eq('id', photoId);
    await supabase.storage.from('profiles').remove([storagePath]);
    return {};
  } catch (err) {
    console.error('deleteProfilePhoto threw:', err);
    return { error: 'could not delete photo' };
  }
}

/** Sets a photo as primary (owner only, server-side). */
export async function setPrimaryPhoto(
  photoId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'not signed in' };
    }
    await supabase
      .from('photos')
      .update({ is_primary: false })
      .eq('user_id', user.id);
    await supabase
      .from('photos')
      .update({ is_primary: true })
      .eq('id', photoId);
    return {};
  } catch (err) {
    console.error('setPrimaryPhoto threw:', err);
    return { error: 'could not update photo' };
  }
}

/**
 * Complimentary membership (giveaways / influencer invites). Guarded by
 * ADMIN_KEY env var. Matches the target by email and grants a tier.
 */
export async function grantComplimentaryMembership(input: {
  key: string;
  email: string;
  tier: 'gold' | 'platinum' | 'diamond';
  days: number;
}): Promise<{ error?: string }> {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || input.key !== adminKey) {
    return { error: 'forbidden' };
  }

  const { data: users } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  const target = users?.users.find(
    (u) => u.email?.toLowerCase() === input.email.toLowerCase()
  );
  if (!target) {
    return { error: 'user not found' };
  }

  const { error } = await supabaseAdmin.from('entitlement_grants').insert({
    user_id: target.id,
    tier: input.tier,
    reason: 'giveaway',
    expires_at: new Date(Date.now() + input.days * 86400000).toISOString()
  });

  if (error) {
    console.error('grant failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/**
 * Guest pass: a paid member brings a Guest up for 24h, by email.
 */
export async function sendGuestPassByEmail(
  guestEmail: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { data: users } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  const target = users?.users.find(
    (u) => u.email?.toLowerCase() === guestEmail.toLowerCase()
  );
  if (!target) {
    return { error: 'user not found' };
  }

  const { error } = await supabase.rpc('send_guest_pass', {
    p_guest: target.id
  });
  if (error) {
    console.error('guest pass failed:', error.message);
    return { error: error.message };
  }
  return {};
}
