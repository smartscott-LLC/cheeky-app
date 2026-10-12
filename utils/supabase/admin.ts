import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
import { supabaseUrl, supabaseServiceKey } from '@/utils/supabase/keys';
import { sendClubMail } from '@/utils/email';

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
// The client is built on first use, not at module load: `next build`
// evaluates route modules during page-data collection, where the service
// key may legitimately be absent (fresh clone). Real runtime calls still
// get a clear error if the env is missing.
let adminClient: SupabaseClient<Database> | null = null;

function getAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'supabaseAdmin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required'
      );
    }
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }
  return adminClient;
}

const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = getAdminClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export { supabaseAdmin };

const applyDiditVerification = async (
  userId: string,
  sessionId: string,
  birthday: string | null
) => {
  const { data: existing } = await supabaseAdmin
    .from('token_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'verification_bonus')
    .maybeSingle();

  if (!existing) {
    const { error: grantError } = await supabaseAdmin
      .from('token_ledger')
      .insert({
        user_id: userId,
        delta: 20,
        reason: 'verification_bonus',
        ref: sessionId
      });
    if (grantError)
      throw new Error(`Verification token grant failed: ${grantError.message}`);

    const { error: momentError } = await supabaseAdmin.rpc(
      'record_common_moment',
      { p_user: userId, p_milestone: 'verification' }
    );
    if (momentError)
      console.error('Verification moment failed:', momentError.message);

    await supabaseAdmin.rpc('award_badge', {
      p_user: userId,
      p_slug: 'verified'
    });

    try {
      const { data: authUser } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (email && process.env.RESEND_API_KEY) {
        await sendClubMail({
          to: email,
          subject: 'Welcome to Club Cheeky',
          text: `You're through the door. Your Silver card is live, and 20 tokens are already on your tab for the Dance Floor.

Head to the club when you're ready — the DJ spins every hour, and the crew is around to say hi.

— The club`
        });
      }
    } catch (mailErr) {
      console.error(
        'Welcome mail failed:',
        mailErr instanceof Error ? mailErr.message : mailErr
      );
    }
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError)
    throw new Error(
      `Profile verification update failed: ${profileError.message}`
    );

  const { error: privateError } = await supabaseAdmin
    .from('profile_private')
    .upsert({
      id: userId,
      verification_provider: 'didit',
      verification_ref: sessionId,
      ...(birthday ? { birthday } : {})
    });
  if (privateError)
    throw new Error(`Verification record failed: ${privateError.message}`);
};

/**
 * Records a failed verification attempt. After 3 attempts the member is
 * escalated to human support instead of looping on Stripe.
 */
const handleVerificationFailure = async (userId: string) => {
  const { data: priv } = await supabaseAdmin
    .from('profile_private')
    .select('verification_attempts')
    .eq('id', userId)
    .maybeSingle();

  const attempts = (priv?.verification_attempts ?? 0) + 1;
  const escalated = attempts >= 3;

  const { error } = await supabaseAdmin
    .from('profile_private')
    .update({
      verification_attempts: attempts,
      verification_escalated_at: escalated ? new Date().toISOString() : null
    })
    .eq('id', userId);

  if (error)
    throw new Error(`Verification failure record failed: ${error.message}`);
};

export { applyDiditVerification, handleVerificationFailure };
