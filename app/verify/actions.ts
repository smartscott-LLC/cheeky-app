'use server';

import { createClient } from '@/utils/supabase/server';
import { createVerificationSession } from '@/utils/stripe/verification';
import { redirect } from 'next/navigation';

const CONSENT_VERSION = 'v1';

/**
 * Brutus asks the question, you answer it. Records the verification
 * consent (governance traceability) and sends the member to Stripe's
 * hosted ID check. Never touches the ID number ourselves.
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

  const session = await createVerificationSession(user.id);
  return redirect(session.url!);
}
