'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { runDateSafe } from '@/utils/datesafe';
import { sendClubMail } from '@/utils/email';
import { Database } from '@/types_db';
import { redirect } from 'next/navigation';
import { withinBudget } from '@/utils/rate-limit';

/**
 * The DateSafe pipeline — runs in the back after a report lands. Finds the
 * reported member's photo and holds it immediately (a hold is an action, not
 * a verdict), pipes it to the AI reviewer (vision model), then: a clean
 * verdict lifts the hold, a violation keeps it, an inconclusive verdict
 * keeps it and stays in the queue for human confirmation. A held photo
 * stops appearing on the floor the moment the report lands.
 * (Spec: docs/Governance/takedown-appeals.md §2)
 */
async function runDateSafeForReport(
  reportId: number,
  reportedId: string,
  reason: string,
  context?: string
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('photos(storage_path, is_primary)')
    .eq('id', reportedId)
    .maybeSingle();

  const photo =
    profile?.photos?.find((p) => p.is_primary) ?? profile?.photos?.[0] ?? null;
  const imageUrl = photo?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/${photo.storage_path}`
    : null;

  // The hold lands now, before the review — reported content comes off the
  // floor while a decision is made, whether or not the allegation holds.
  const heldAt = new Date().toISOString();
  if (photo?.storage_path) {
    await supabaseAdmin
      .from('photos')
      .update({ held_at: heldAt })
      .eq('storage_path', photo.storage_path);
  }

  const complaint = `${reason}${context ? ` — conversation: ${context}` : ''}`;
  const verdict = await runDateSafe({ imageUrl, complaint });

  const updates: Partial<Database['public']['Tables']['reports']['Update']> = {
    verdict: verdict.verdict,
    category: verdict.category,
    confidence: verdict.confidence,
    review_summary: verdict.summary,
    reviewed_at: new Date().toISOString(),
    image_url: imageUrl,
    held_at: imageUrl ? heldAt : null
  };

  if (verdict.verdict === 'clean') {
    // Unfounded — the hold lifts and the reported content is restored.
    if (photo?.storage_path) {
      await supabaseAdmin
        .from('photos')
        .update({ held_at: null })
        .eq('storage_path', photo.storage_path);
    }
    updates.held_at = null;
    updates.status = 'reviewed';
    updates.outcome = 'no_action';

    // The apology email — best-effort, never fail the review for mail.
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
        reportedId
      );
      if (authUser?.user?.email && process.env.RESEND_API_KEY) {
        await sendClubMail({
          to: authUser.user.email,
          subject: 'An apology from the club',
          text: `Something came to the desk about your profile, and after review it was cleared. The block is lifted — nothing to worry about.

Sorry for the interruption. The safety desk looks at everything, and this one came back in your favor.

— The club`
        });
      }
    } catch (mailErr) {
      console.error(
        'Apology mail failed:',
        mailErr instanceof Error ? mailErr.message : mailErr
      );
    }
  } else if (verdict.verdict === 'violation') {
    // Confirmed violation — the hold stays; the ban ladder is human-led.
    updates.status = 'reviewed';
    updates.outcome = 'action_taken';
  } else {
    // Inconclusive — hold stays, report stays pending for human review.
    updates.status = 'pending';
    updates.outcome = null;
  }

  await supabaseAdmin.from('reports').update(updates).eq('id', reportId);
}

/**
 * Resolves (or creates) the conversation with another member and opens it.
 */
export async function openConversation(otherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_other: otherId
  });

  if (error) {
    console.error('openConversation failed:', error.message);
    return redirect('/messages');
  }

  return redirect(`/messages/${data}`);
}

/**
 * Sends a message through the enforcing RPC (matched: unlimited,
 * cold: 5/day, block-aware). Returns errors for the composer to show.
 */
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body
  });

  if (error) {
    console.error('sendMessage failed:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function reportUser(
  reportedId: string,
  reason: string,
  context?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  // The report desk has a budget too (audit #9): five per hour per member is
  // already far beyond legitimate use, and each report spends a DateSafe
  // vision review — this stops a flood from burying the desk or running up
  // the reviewer bill. Budget is only consumed on an accepted report.
  const allowed = await withinBudget(`report:user:${user.id}`, 60 * 60, 5);
  if (!allowed) {
    return {
      error:
        'The safety desk already has a few reports from you this hour — they are on it. Try again in about an hour.'
    };
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_id: reportedId,
      reason,
      context: context ?? null
    })
    .select('id')
    .single();

  if (error) {
    console.error('report failed:', error.message);
    return { error: error.message };
  }

  // DateSafe: the back-end reviewer takes it from here — reported content is
  // held the moment the report lands, reviewed by the AI, and the hold is
  // lifted only if the allegation is unfounded. Fire-and-forget so the
  // reporter isn't kept waiting on the AI.
  if (report?.id) {
    void runDateSafeForReport(report.id, reportedId, reason, context).catch(
      (e: unknown) =>
        console.error('DateSafe review failed:', e instanceof Error ? e.message : e)
    );
  }
  return {};
}

export async function blockUser(
  blockedId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase.from('blocks').insert({
    blocker_id: user.id,
    blocked_id: blockedId
  });

  if (error) {
    console.error('block failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Song chat: event messages travel outside daily messaging caps. */
export async function sendEventMessage(
  conversationId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_event_message', {
    p_conversation_id: conversationId,
    p_body: body
  });
  if (error) {
    console.error('sendEventMessage failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/**
 * Adds a certificate-match partner to your Special Interests. Server-side
 * gate (add_special_interest): you must hold a certificate with this person.
 */
export async function addSpecialInterest(
  interestUserId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('add_special_interest', {
    p_interest_user: interestUserId
  });
  if (error) {
    console.error('addSpecialInterest failed:', error.message);
    return { error: error.message };
  }
  return {};
}

/** Post-song decision: continue the match or close it (no follow-ups). */
export async function resolveSong(
  matchId: string,
  keepGoing: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('resolve_song', {
    p_match_id: matchId,
    p_continue: keepGoing
  });
  if (error) {
    console.error('resolveSong failed:', error.message);
    return { error: error.message };
  }
  return {};
}
