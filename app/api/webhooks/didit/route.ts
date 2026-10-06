import { NextResponse, type NextRequest } from 'next/server';
import {
  supabaseAdmin,
  applyDiditVerification,
  handleVerificationFailure
} from '@/utils/supabase/admin';
import { syncMembershipToManifest } from '@/utils/membership-manifest';
import { verifyDiditWebhook } from '@/utils/didit-webhook';

/**
 * Didit's phone line (docs/PRD-onboarding.md): the ONLY authoritative
 * source of verification truth — the callback redirect is signage.
 * Order per the integration contract: freshness → canonical HMAC →
 * event_id idempotency → case-sensitive status dispatch → fast 2xx.
 */

interface DiditEvent {
  event_id?: string;
  session_id?: string;
  webhook_type?: string;
  status?: string;
  vendor_data?: string;
  decision?: {
    id_verifications?: { date_of_birth?: string }[];
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const raw = await request.text();

  const checked = verifyDiditWebhook(
    raw,
    {
      signatureV2: request.headers.get('x-signature-v2'),
      signature: request.headers.get('x-signature'),
      timestamp: request.headers.get('x-timestamp')
    },
    process.env.DIDIT_WEBHOOK_SECRET ?? '',
    Math.floor(Date.now() / 1000)
  );
  if (!checked.ok) {
    console.error('didit webhook: signature rejected —', checked.error);
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }

  let event: DiditEvent;
  try {
    event = JSON.parse(raw) as DiditEvent;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  // Session decision events only (our subscription). Everything else: 200
  // so Didit stops redelivering, but we act on nothing.
  if (
    event.webhook_type !== 'status.updated' ||
    !event.event_id ||
    !event.session_id
  ) {
    return NextResponse.json({ ok: true, ignored: event.webhook_type });
  }

  const { data: firstSeen } = await supabaseAdmin.rpc(
    'mark_webhook_processed',
    {
      p_event_id: event.event_id,
      p_event_type: `didit:${event.status ?? '?'}`,
      p_payload: {
        session_id: event.session_id,
        vendor_data: event.vendor_data
      }
    }
  );
  if (!firstSeen) return NextResponse.json({ ok: true, deduped: true });

  const userId = event.vendor_data ?? '';
  if (!UUID_RE.test(userId)) {
    console.error('didit webhook: vendor_data is not a club uuid');
    return NextResponse.json({ ok: true, ignored: 'bad vendor_data' });
  }

  switch (event.status) {
    case 'Approved': {
      const dob = event.decision?.id_verifications?.[0]?.date_of_birth;
      const birthday = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : null;
      try {
        await applyDiditVerification(userId, event.session_id!, birthday);
      } catch (err) {
        console.error(
          'didit webhook: grant chain failed:',
          err instanceof Error ? err.message : err
        );
        return NextResponse.json({ error: 'grant failed' }, { status: 500 });
      }
      const mirrored = await syncMembershipToManifest(supabaseAdmin, userId);
      if (!mirrored.ok)
        console.error('didit webhook: manifest mirror failed:', mirrored.error);
      break;
    }
    case 'Declined':
      await handleVerificationFailure(userId);
      break;
    case 'In Review':
    case 'Resubmitted':
    case 'Kyc Expired':
    case 'Abandoned':
      console.log(
        `didit webhook: status ${event.status} for ${userId} (session ${event.session_id}) — owner-tools review`
      );
      break;
    default:
      // Not Started / In Progress / Expired / Awaiting User — no action.
      break;
  }

  return NextResponse.json({ ok: true });
}
