import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange,
  deleteProductRecord,
  deletePriceRecord,
  applyVerificationResult,
  handleVerificationFailure,
  supabaseAdmin
} from '@/utils/supabase/admin';

const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'identity.verification_session.verified',
  'identity.verification_session.requires_input',
  'identity.verification_session.canceled'
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret)
      return new Response('Webhook secret not found.', { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);

    // Idempotency guard: use a DB-side atomic function to mark processed events.
    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        'mark_webhook_processed',
        {
          p_event_id: event.id,
          p_event_type: event.type,
          p_payload: event.data.object as any
        }
      );

      if (rpcError) {
        console.log('❌ RPC error marking webhook processed:', rpcError.message || rpcError);
        return new Response('Webhook handler failed (idempotency rpc).', { status: 500 });
      }

      // Supabase RPC returns an array-like result; when the function returns a scalar boolean
      // it often appears as [{ mark_webhook_processed: true }] or [true] depending on the client.
      const processed = Array.isArray(rpcData)
        ? // try multiple shapes
          (rpcData[0] === true || (rpcData[0] && (rpcData[0].mark_webhook_processed === true || Object.values(rpcData[0])[0] === true)))
        : Boolean(rpcData);

      if (!processed) {
        console.log(`🔁 Duplicate webhook event ignored: ${event.id}`);
        return new Response(JSON.stringify({ received: true }));
      }
    } catch (recErr: any) {
      console.log('❌ Error recording webhook idempotency RPC:', recErr?.message ?? recErr);
      // Fail closed: prefer not to process if the idempotency store is unreachable.
      return new Response('Webhook handler failed (idempotency store).', { status: 500 });
    }

  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case 'price.deleted':
          await deletePriceRecord(event.data.object as Stripe.Price);
          break;
        case 'product.deleted':
          await deleteProductRecord(event.data.object as Stripe.Product);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === 'customer.subscription.created'
          );
          break;
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription;
            await manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
        case 'identity.verification_session.verified':
          const verificationSession =
            event.data.object as Stripe.Identity.VerificationSession;
          const userId = verificationSession.metadata?.supabaseUUID;
          if (userId) {
            await applyVerificationResult(userId, verificationSession.id);
          } else {
            console.log(
              'Verification session without supabaseUUID (created outside the app) — ignoring.'
            );
          }
          break;
        case 'identity.verification_session.requires_input':
        case 'identity.verification_session.canceled': {
          const failedSession =
            event.data.object as Stripe.Identity.VerificationSession;
          const failedUserId = failedSession.metadata?.supabaseUUID;
          if (failedUserId) {
            await handleVerificationFailure(failedUserId);
          }
          break;
        }
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.log(error);
      return new Response(
        'Webhook handler failed. View your Next.js function logs.',
        {
          status: 400
        }
      );
    }
  } else {
    // Acknowledge everything else — Stripe retries only non-2xx responses,
    // and unhandled events (e.g. other identity.session states) are normal.
    console.log(`ℹ️  Unhandled event acknowledged: ${event.type}`);
  }
  return new Response(JSON.stringify({ received: true }));
}
