'use server';

import sharp from 'sharp';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { recordMoment } from '@/utils/character-moments';

export async function updateProfile(
  displayName: string,
  bio: string,
  interestedIn?: 'women' | 'men' | 'everyone',
  gender?: 'gentleman' | 'lady' | null,
  oneLiner?: string,
  honeypot?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  // Honeypot: a filled hidden field means a bot. Flag the account (the
  // activity guards shut it down) and never save — no warning, no mercy.
  if (honeypot) {
    await supabaseAdmin.rpc('flag_honeypot_catch', {
      p_field: 'website',
      p_page: 'profile',
      p_user: user.id
    });
    return { error: 'could not save' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim().slice(0, 50),
      bio: bio.trim().slice(0, 500),
      one_liner: (oneLiner ?? '').trim().slice(0, 80) || null,
      interested_in: interestedIn ?? 'everyone',
      gender: gender ?? null
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
 * RLS-clean). Receives the file via FormData. Position + primary are
 * computed server-side (never trust the client).
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

    // Every upload becomes a normalized WebP server-side: EXIF auto-orient
    // (kills sideways selfies), capped at 1200px on the long edge (feed
    // cards never need more), and encoded ~80% smaller than the source —
    // the same PNG→WebP play that cut the floor/persona art 91-94%. The
    // storage path has no extension, so nothing downstream changes.
    let webp: Buffer;
    try {
      webp = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (convErr) {
      console.error('photo conversion failed:', convErr);
      return {
        error: 'could not read that image — try a JPG or PNG straight from your camera'
      };
    }

    // Position is server-computed (never trust the client — earlier broken
    // client states wrote duplicate positions). First photo = position 0 + primary.
    const { data: lastPhoto } = await supabase
      .from('photos')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (lastPhoto?.position ?? -1) + 1;
    const isFirst = position === 0;

    const storagePath = `${user.id}/${crypto.randomUUID()}`;
    const { error: upErr } = await supabase.storage
      .from('profiles')
      .upload(storagePath, webp, { contentType: 'image/webp' });
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

  // Personal milestone — the host(ess)/bouncer greets them on their floor.
  await recordMoment(target.id, 'membership');
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
