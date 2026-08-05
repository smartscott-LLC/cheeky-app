'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { createVerificationSession } from '@/utils/stripe/verification';
import { getURL } from '@/utils/helpers';
import { redirect } from 'next/navigation';

const CONSENT_VERSION = 'v1';

function isValidEmail(email: string) {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email);
}

/**
 * The one-stop door: all four consents and the account live with Brutus.
 * Creates the account (no birthday — Stripe verifies it and hands it back
 * via the webhook), records the consents, and sends the member straight
 * into the ID check. After Stripe: verify the email, then the lobby.
 */
export async function checkInAtTheDoor(formData: FormData) {
  const honeypot = String(formData.get('company') ?? '').trim();
  if (honeypot) {
    await supabaseAdmin.rpc('flag_honeypot_catch', {
      p_field: 'company',
      p_page: 'checkin',
      p_email: String(formData.get('email') ?? '')
    });
    return redirect('/verify?error=honeypot');
  }

  const allConsents = [
    'termsConsent',
    'privacyConsent',
    'bestPracticesConsent',
    'verificationConsent'
  ].every((name) => formData.get(name) === 'on');
  if (!allConsents) return redirect('/verify?error=consent');

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  const interestedIn = String(formData.get('interestedIn') ?? '').trim();
  const retention = Number(formData.get('messageRetentionDays') ?? 90);

  if (gender !== 'gentleman' && gender !== 'lady')
    return redirect('/verify?error=gender');
  if (!isValidEmail(email) || !password)
    return redirect('/verify?error=form');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getURL('/auth/callback'),
      data: {
        message_retention_days: Math.min(90, Math.max(7, retention)),
        gender,
        interested_in:
          interestedIn === 'women' || interestedIn === 'men'
            ? interestedIn
            : 'everyone',
        full_name: fullName || undefined,
        terms_version: 'v1',
        privacy_version: 'v1',
        best_practices_version: 'v1'
      }
    }
  });

  const userId = data.user?.id;
  if (error || !userId) {
    const msg = error?.message ?? '';
    return redirect(
      `/verify?error=${msg.toLowerCase().includes('registered') ? 'taken' : 'signup'}`
    );
  }

  // Record all four consents (idempotent per type) + their name.
  const consents = [
    ['terms', 'v1'],
    ['privacy', 'v1'],
    ['best_practices', 'v1'],
    ['verification', CONSENT_VERSION]
  ] as const;
  for (const [type, version] of consents) {
    await supabase.from('consents').upsert(
      { user_id: userId, consent_type: type, version },
      { onConflict: 'user_id,consent_type' }
    );
  }
  if (fullName) {
    await supabase
      .from('profiles')
      .update({ display_name: fullName })
      .eq('id', userId);
  }

  // Straight into the ID check — email verification comes after.
  const session = await createVerificationSession(userId);
  return redirect(session.url!);
}

/**
 * Brutus asks the question, you answer it. Records the verification
 * consent (governance traceability) and sends the member to Stripe's
 * hosted ID check. Never touches the ID number ourselves. (Logged-in
 * members who reached the door mid-flow.)
 */
export async function startVerification(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/signin');
  }

  if (formData.get('verificationConsent') !== 'on') {
    return redirect('/verify?error=consent');
  }

  // Record consent (idempotent — one row per consent type).
  const { data: existing } = await supabase
    .from('consents')
    .select('id')
    .eq('user_id', user.id)
    .eq('consent_type', 'verification')
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('consents').insert({
      user_id: user.id,
      consent_type: 'verification',
      version: CONSENT_VERSION
    });
    if (error) {
      console.error('Consent record failed:', error.message);
    }
  }

  // Carry the name they gave at signup into the ID check — one entry, not
  // two signups. Also save it as their display name if they haven't set one.
  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';
  if (fullName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.display_name) {
      await supabase
        .from('profiles')
        .update({ display_name: fullName })
        .eq('id', user.id);
    }
  }

  const session = await createVerificationSession(user.id);
  return redirect(session.url!);
}
