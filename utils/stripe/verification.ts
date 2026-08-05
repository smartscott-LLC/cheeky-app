import { stripe } from '@/utils/stripe/config';
import { getURL } from '@/utils/helpers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import Stripe from 'stripe';

/**
 * Creates a Stripe Identity verification session — the Brutus the Bouncer
 * Door Check. The member is redirected to Stripe's hosted page, keys in
 * name, date of birth, and government ID number, and Stripe validates
 * against government/third-party databases (US SSN currently).
 *
 * The session carries the user id in metadata so the webhook can attribute
 * the result. We never see or store the ID number. Email is pre-filled
 * from the signup so the check doesn't feel like a second signup (name,
 * DOB, and the ID number are Stripe's to collect for the ID match).
 */
export const createVerificationSession = async (userId: string) => {
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
    userId
  );

  const provided: Stripe.Identity.VerificationSessionCreateParams.ProvidedDetails =
    {};
  if (authUser?.user?.email) provided.email = authUser.user.email;

  const session = await stripe.identity.verificationSessions.create({
    type: 'id_number',
    metadata: { supabaseUUID: userId },
    provided_details: provided,
    // ?checked=1 tells /verify the member just left the ID check — show the
    // 'check your email' step instead of the form again.
    return_url: `${getURL()}/verify?checked=1`
  });

  return session;
};
