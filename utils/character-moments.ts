import 'server-only';
import { supabaseAdmin } from '@/utils/supabase/admin';

export type MomentMilestone = 'verification' | 'membership' | 'gift_accepted';

/**
 * Records a milestone greeting from the cast (service-role, server-only).
 *
 * Common milestones (verification) use the fixed cast; personal milestones
 * (membership, gift_accepted) pick the greeter by the member's preferred
 * orientation — privately, never displayed publicly (same rule as Speed
 * Dating grouping). The cast + line curation live in security-definer RPCs,
 * so members can't fabricate or spam greetings.
 *
 * Best-effort: a failed moment is logged, never allowed to break the
 * surrounding flow (webhook, purchase, gift).
 */
export async function recordMoment(
  userId: string,
  milestone: MomentMilestone
): Promise<void> {
  const rpc =
    milestone === 'verification'
      ? 'record_common_moment'
      : 'record_personal_moment';

  const { error } = await supabaseAdmin.rpc(rpc, {
    p_user: userId,
    p_milestone: milestone
  });

  if (error) {
    console.error(`Character moment (${milestone}) failed:`, error.message);
  }
}
