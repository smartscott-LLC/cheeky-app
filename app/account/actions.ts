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
