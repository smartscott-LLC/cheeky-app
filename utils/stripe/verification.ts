import { stripe } from '@/utils/stripe/config';
import { getURL } from '@/utils/helpers';

/**
 * Creates a Stripe Identity verification session — the Brutus the Bouncer
 * Door Check. The member is redirected to Stripe's hosted page, keys in
 * name, date of birth, and government ID number, and Stripe validates
 * against government/third-party databases (US SSN currently).
 *
 * The session carries the user id in metadata so the webhook can attribute
 * the result. We never see or store the ID number.
 */
export const createVerificationSession = async (userId: string) => {
  const session = await stripe.identity.verificationSessions.create({
    type: 'id_number',
    metadata: { supabaseUUID: userId },
    return_url: `${getURL()}/verify`
  });

  return session;
};
