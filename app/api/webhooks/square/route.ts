import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { syncMembershipToManifest } from '@/utils/membership-manifest';
import { grantForItem, verifySquareSignature } from '@/utils/square-webhook';
import { parseTokenAmount } from '@/utils/token-amount';

/**
 * Square store webhook (docs/PRD-square-didit.md) — the register's phone
 * line. order.payment.completed → verify signature → idempotency (webhook
 * events guard + store_purchases UNIQUE(order_id, sku)) → fetch order →
 * match buyer by email → grants: entitlement (paid/trial floors), tokens
 * (per the ITEM_LIBRARY contract), purchase record (ALL items, incl. the
 * $0 Silver pass-through) → mirror manifest.membership. Gift sets record
 * with fulfilled=false for the owner-tools queue — logged loudly, never
 * silently dropped.
 */

const SQUARE_API = 'https://connect.squareup.com';
const NOTIFICATION_URL =
  process.env.SQUARE_WEBHOOK_URL ||
  'https://www.smartscott.online/api/webhooks/square';

async function squareGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`${SQUARE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2025-01-23'
    }
  });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

interface SquareOrder {
  id: string;
  customer_id?: string;
  total_money?: { amount: number };
  line_items?: {
    item_variation_data?: { item_id?: string; name?: string };
    base_price_money?: { amount: number };
  }[];
  tenders?: { customer_id?: string }[];
}

async function buyerEmail(order: SquareOrder): Promise<string | null> {
  const customerId =
    order.customer_id ?? order.tenders?.find((t) => t.customer_id)?.customer_id;
  if (!customerId) return null;
  const c = await squareGet<{ customer?: { email_address?: string } }>(
    `/v2/customers/${customerId}`
  );
  return c?.customer?.email_address ?? null;
}

async function userByEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  const u = data.users.find(
    (x) => x.email?.toLowerCase() === email.toLowerCase()
  );
  return u?.id ?? null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-square-signature') ?? '';
  const timestamp = request.headers.get('x-square-request-timestamp') ?? '';
  const type = request.headers.get('x-square-notification-type') ?? '';

  if (
    !verifySquareSignature(
      NOTIFICATION_URL,
      timestamp,
      signature,
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ''
    )
  ) {
    console.error('square webhook: signature verification FAILED');
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }

  let event: { id?: string; data?: { object?: { id?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (type !== 'order.payment.completed') {
    return NextResponse.json({ ok: true, ignored: type }); // future event families
  }

  const eventId = event.id ?? `order:${event.data?.object?.id}`;
  const { data: firstSeen } = await supabaseAdmin.rpc(
    'mark_webhook_processed',
    {
      p_event_id: eventId,
      p_event_type: type,
      p_payload: event.data?.object ?? {}
    }
  );
  if (!firstSeen) return NextResponse.json({ ok: true, deduped: true });

  const orderId = event.data?.object?.id;
  if (!orderId) return NextResponse.json({ ok: true });

  const orderData = await squareGet<{ order?: SquareOrder }>(
    `/v2/orders/${orderId}`
  );
  const order = orderData?.order;
  if (!order) {
    console.error(`square webhook: order ${orderId} fetch failed`);
    return NextResponse.json({ error: 'order fetch failed' }, { status: 502 });
  }

  const email = await buyerEmail(order);
  const userId = email ? await userByEmail(email) : null;
  if (!userId) {
    // Loud, recorded, non-retryable-by-Square: answer 200 so Square stops
    // redelivery, and leave the order for the owner-tools manual grant.
    console.error(
      `square webhook: NO CLUB ACCOUNT for buyer ${email ?? '(no email)'} on order ${orderId}`
    );
    return NextResponse.json({ ok: true, unmatched: true });
  }

  let granted = 0;
  for (const li of order.line_items ?? []) {
    const itemId = li.item_variation_data?.item_id;
    const item = itemId ? grantForItem(itemId) : null;
    if (!item) {
      console.error(
        `square webhook: unknown item ${itemId ?? '?'} (${li.item_variation_data?.name}) on ${orderId}`
      );
      continue;
    }

    // Purchase record — the idempotency lock (unique order_id+sku).
    const { data: purchase, error: pErr } = await supabaseAdmin
      .from('store_purchases')
      .insert({
        order_id: orderId,
        sku: item.sku,
        user_id: userId,
        item_name: item.name,
        kind: item.kind,
        tier: item.tier,
        days: item.days,
        tokens:
          item.kind === 'tokens'
            ? (parseTokenAmount(item.name) ?? item.tokens)
            : item.tokens,
        amount_cents: li.base_price_money?.amount ?? item.amountCents,
        fulfilled: item.kind !== 'gift_set'
      })
      .select('id')
      .maybeSingle();
    if (pErr || !purchase) {
      // duplicate delivery of this line — skip quietly, the first one won
      continue;
    }
    granted++;

    const ref = `${orderId}:${item.sku}`;
    if (
      (item.kind === 'membership' || item.kind === 'trial') &&
      item.tier &&
      item.tier !== 'silver' &&
      item.days != null // paid floors are always time-boxed (contract)
    ) {
      await supabaseAdmin.from('entitlement_grants').insert({
        user_id: userId,
        tier: item.tier,
        reason: `purchase:${ref}`,
        expires_at: new Date(
          Date.now() + item.days * 86400000
        ).toISOString()
      });
    }
    const tokenAmount =
      item.kind === 'tokens' ? (parseTokenAmount(item.name) ?? 0) : item.tokens;
    if (tokenAmount > 0) {
      await supabaseAdmin.from('token_ledger').insert({
        user_id: userId,
        delta: tokenAmount,
        reason: item.kind === 'tokens' ? 'token_purchase' : 'membership_token',
        ref
      });
    }
    if (item.kind === 'gift_set') {
      console.warn(
        `square webhook: gift_set ${item.name} on ${orderId} recorded for OWNER-TOOLS fulfilment (fulfilled=false)`
      );
    }
  }

  if (granted > 0) {
    const mirrored = await syncMembershipToManifest(supabaseAdmin, userId);
    if (!mirrored.ok)
      console.error('square webhook: manifest mirror failed:', mirrored.error);
  }
  return NextResponse.json({ ok: true, granted });
}
