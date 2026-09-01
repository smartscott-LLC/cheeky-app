import 'server-only';
import { toDateTime } from '@/utils/helpers';
import { stripe } from '@/utils/stripe/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database, Tables, TablesInsert } from 'types_db';
import { supabaseUrl, supabaseServiceKey } from '@/utils/supabase/keys';
import { sendClubMail } from '@/utils/email';
import { parseTokenAmount } from '@/utils/token-amount';
import {
  membershipTokenGrant,
  membershipGrantRef,
  membershipTierRank
} from '@/utils/membership-tokens';

type Product = Tables<'products'>;
type Price = Tables<'prices'>;

// Change to control trial period length
const TRIAL_PERIOD_DAYS = 0;

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

export { supabaseAdmin };

const upsertProductRecord = async (product: Stripe.Product) => {
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata
  };

  const { error: upsertError } = await supabaseAdmin
    .from('products')
    .upsert([productData]);
  if (upsertError)
    throw new Error(`Product insert/update failed: ${upsertError.message}`);
  console.log(`Product inserted/updated: ${product.id}`);
};

const upsertPriceRecord = async (
  price: Stripe.Price,
  retryCount = 0,
  maxRetries = 3
) => {
  const priceData: Price = {
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : '',
    active: price.active,
    currency: price.currency,
    type: price.type,
    unit_amount: price.unit_amount ?? null,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? TRIAL_PERIOD_DAYS,
    description: price.nickname ?? null,
    metadata: price.metadata ?? {}
  };

  const { error: upsertError } = await supabaseAdmin
    .from('prices')
    .upsert([priceData]);

  if (upsertError?.message.includes('foreign key constraint')) {
    if (retryCount < maxRetries) {
      console.log(`Retry attempt ${retryCount + 1} for price ID: ${price.id}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await upsertPriceRecord(price, retryCount + 1, maxRetries);
    } else {
      throw new Error(
        `Price insert/update failed after ${maxRetries} retries: ${upsertError.message}`
      );
    }
  } else if (upsertError) {
    throw new Error(`Price insert/update failed: ${upsertError.message}`);
  } else {
    console.log(`Price inserted/updated: ${price.id}`);
  }
};

const deleteProductRecord = async (product: Stripe.Product) => {
  const { error: deletionError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', product.id);
  if (deletionError)
    throw new Error(`Product deletion failed: ${deletionError.message}`);
  console.log(`Product deleted: ${product.id}`);
};

/**
 * Applies a successful Stripe Identity verification:
 * marks the profile verified, records the provider reference, and grants
 * the one-time +20 token bonus (idempotent). Service-role only.
 */
const applyVerificationResult = async (userId: string, sessionId: string) => {
  // Idempotent +20 token bonus. The webhook route's event-level guard
  // (webhook_events) already blocks duplicate processing; this per-reason
  // check is a second layer of defense.
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

    // First verification — Brutus greets you at the door. Best-effort:
    // never fail the webhook because a greeting didn't land.
    const { error: momentError } = await supabaseAdmin.rpc(
      'record_common_moment',
      { p_user: userId, p_milestone: 'verification' }
    );
    if (momentError)
      console.error('Verification moment failed:', momentError.message);

    // First verification — the "In the Club" badge goes on the coat.
    await supabaseAdmin.rpc('award_badge', {
      p_user: userId,
      p_slug: 'verified'
    });

    // Welcome to the club — best-effort, mail must never fail the webhook.
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
      verification_provider: 'stripe_identity',
      verification_ref: sessionId,
      ...(await verifiedDob(sessionId))
    });
  if (privateError)
    throw new Error(`Verification record failed: ${privateError.message}`);
};

/**
 * The DOB Stripe verified, pulled from the verification report — the member
 * never enters it twice (Stripe and Supabase share what Stripe collected).
 * Best-effort: age is already enforced by the ID check itself.
 */
async function verifiedDob(sessionId: string): Promise<{ birthday?: string }> {
  try {
    const vs = await stripe.identity.verificationSessions.retrieve(sessionId, {
      expand: ['last_verification_report']
    });
    const report = vs.last_verification_report;
    if (report && typeof report !== 'string') {
      const dob = report.id_number?.dob;
      if (dob?.year && dob?.month && dob?.day) {
        const birthday = `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(
          dob.day
        ).padStart(2, '0')}`;
        return { birthday };
      }
    }
  } catch (err) {
    console.error(
      'DOB backfill failed:',
      err instanceof Error ? err.message : err
    );
  }
  return {};
}

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

const deletePriceRecord = async (price: Stripe.Price) => {
  const { error: deletionError } = await supabaseAdmin
    .from('prices')
    .delete()
    .eq('id', price.id);
  if (deletionError)
    throw new Error(`Price deletion failed: ${deletionError.message}`);
  console.log(`Price deleted: ${price.id}`);
};

const upsertCustomerToSupabase = async (uuid: string, customerId: string) => {
  const { error: upsertError } = await supabaseAdmin
    .from('customers')
    .upsert([{ id: uuid, stripe_customer_id: customerId }]);

  if (upsertError)
    throw new Error(
      `Supabase customer record creation failed: ${upsertError.message}`
    );

  return customerId;
};

const createCustomerInStripe = async (uuid: string, email: string) => {
  const customerData = { metadata: { supabaseUUID: uuid }, email: email };
  const newCustomer = await stripe.customers.create(customerData);
  if (!newCustomer) throw new Error('Stripe customer creation failed.');

  return newCustomer.id;
};

const createOrRetrieveCustomer = async ({
  email,
  uuid
}: {
  email: string;
  uuid: string;
}) => {
  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer, error: queryError } =
    await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', uuid)
      .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase customer lookup failed: ${queryError.message}`);
  }

  // Retrieve the Stripe customer ID using the Supabase customer ID, with email fallback
  let stripeCustomerId: string | undefined;
  if (existingSupabaseCustomer?.stripe_customer_id) {
    const existingStripeCustomer = await stripe.customers.retrieve(
      existingSupabaseCustomer.stripe_customer_id
    );
    stripeCustomerId = existingStripeCustomer.id;
  } else {
    // If Stripe ID is missing from Supabase, try to retrieve Stripe customer ID by email
    const stripeCustomers = await stripe.customers.list({ email: email });
    stripeCustomerId =
      stripeCustomers.data.length > 0 ? stripeCustomers.data[0].id : undefined;
  }

  // If still no stripeCustomerId, create a new customer in Stripe
  const stripeIdToInsert = stripeCustomerId
    ? stripeCustomerId
    : await createCustomerInStripe(uuid, email);
  if (!stripeIdToInsert) throw new Error('Stripe customer creation failed.');

  if (existingSupabaseCustomer && stripeCustomerId) {
    // If Supabase has a record but doesn't match Stripe, update Supabase record
    if (existingSupabaseCustomer.stripe_customer_id !== stripeCustomerId) {
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', uuid);

      if (updateError)
        throw new Error(
          `Supabase customer record update failed: ${updateError.message}`
        );
      console.warn(
        `Supabase customer record mismatched Stripe ID. Supabase record updated.`
      );
    }
    // If Supabase has a record and matches Stripe, return Stripe customer ID
    return stripeCustomerId;
  } else {
    console.warn(
      `Supabase customer record was missing. A new record was created.`
    );

    // If Supabase has no record, create a new record and return Stripe customer ID
    const upsertedStripeCustomer = await upsertCustomerToSupabase(
      uuid,
      stripeIdToInsert
    );
    if (!upsertedStripeCustomer)
      throw new Error('Supabase customer record creation failed.');

    return upsertedStripeCustomer;
  }
};

/**
 * Copies the billing details from the payment method to the customer object.
 */
const copyBillingDetailsToCustomer = async (
  uuid: string,
  payment_method: Stripe.PaymentMethod
) => {
  //Todo: check this assertion
  const customer = payment_method.customer as string;
  const { name, phone, address } = payment_method.billing_details;
  if (!name || !phone || !address) return;
  //@ts-ignore
  await stripe.customers.update(customer, { name, phone, address });
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      billing_address: { ...address },
      payment_method: { ...payment_method[payment_method.type] }
    })
    .eq('id', uuid);
  if (updateError)
    throw new Error(`Customer update failed: ${updateError.message}`);
};

const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  createAction = false
) => {
  // Get customer's UUID from mapping table.
  const { data: customerData, error: noCustomerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (noCustomerError)
    throw new Error(`Customer lookup failed: ${noCustomerError.message}`);

  const { id: uuid } = customerData!;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method']
  });
  // Upsert the latest status of the subscription object.
  const subscriptionData: TablesInsert<'subscriptions'> = {
    id: subscription.id,
    user_id: uuid,
    metadata: subscription.metadata,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    //TODO check quantity on subscription
    // @ts-ignore
    quantity: subscription.quantity,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? toDateTime(subscription.cancel_at).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    current_period_start: toDateTime(
      subscription.current_period_start
    ).toISOString(),
    current_period_end: toDateTime(
      subscription.current_period_end
    ).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    ended_at: subscription.ended_at
      ? toDateTime(subscription.ended_at).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? toDateTime(subscription.trial_end).toISOString()
      : null
  };

  const { error: upsertError } = await supabaseAdmin
    .from('subscriptions')
    .upsert([subscriptionData]);
  if (upsertError)
    throw new Error(
      `Subscription insert/update failed: ${upsertError.message}`
    );
  console.log(
    `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
  );

  // New membership — the host(ess)/bouncer greets you on your floor. The
  // RPC dedupes within 24h so the checkout + subscription webhooks (which
  // both land here with createAction) greet once, not twice. Best-effort.
  if (createAction) {
    const { error: momentError } = await supabaseAdmin.rpc(
      'record_personal_moment',
      { p_user: uuid, p_milestone: 'membership' }
    );
    if (momentError)
      console.error('Membership moment failed:', momentError.message);
  }

  // Membership tokens — part of the package, every cycle (Gold 100,
  // Platinum 200, Diamond 500). Idempotent per subscription + period +
  // tier, so the created/updated/checkout triple-fire never double-grants
  // and a mid-cycle upgrade lands its new tier's grant immediately.
  await grantMembershipTokens(uuid, subscription);

  // For a new subscription copy the billing details to the customer object.
  // NOTE: This is a costly operation and should happen at the very end.
  if (createAction && subscription.default_payment_method && uuid)
    //@ts-ignore
    await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method as Stripe.PaymentMethod
    );
};

/**
 * Credits the ledger when a one-time token pack clears checkout. The
 * webhook's event-level idempotency guard (webhook_events) blocks replays;
 * ref = the Stripe session id. Token count comes from the product name
 * ("Cheeky Token Bag - 100 Tokens"), synced from Stripe — no hardcoded
 * price ids, so re-created products still credit.
 */
const creditTokenPurchase = async (session: Stripe.Checkout.Session) => {
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price.product']
  });
  const item = full.line_items?.data?.[0];
  const product = item?.price?.product;
  if (
    !item ||
    typeof product !== 'object' ||
    !('name' in product) ||
    !product.name
  ) {
    console.log('Token purchase: no line-item product to credit.');
    return;
  }
  const amount = parseTokenAmount(product.name);
  if (amount === null) {
    console.log(`Token purchase: "${product.name}" is not a token product.`);
    return;
  }
  const { data: customerRow } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', full.customer as string)
    .maybeSingle();
  if (!customerRow?.id) {
    console.log('Token purchase: no Supabase customer mapping.');
    return;
  }
  const { error } = await supabaseAdmin.from('token_ledger').insert({
    user_id: customerRow.id,
    delta: amount,
    reason: 'token_purchase',
    ref: full.id
  });
  if (error) throw new Error(`Token purchase credit failed: ${error.message}`);
  console.log(`🪙 Token purchase credited: +${amount} to ${customerRow.id}`);
};

/**
 * Membership token grants (PRD-event-logic §7): every paid membership comes
 * with tokens, every cycle — Gold 100, Platinum 200, Diamond 500. Resolves
 * the tier from the synced products table (no hardcoded price ids).
 *
 * Grants start at the FIRST PAID cycle — trials grant nothing (tokens come
 * with a purchase, not a promise). Idempotent per subscription + period +
 * tier, and gated by tier rank: a mid-cycle UPGRADE lands its new tier's
 * grant immediately, but a downgrade (or any repeat for the same period)
 * never grants again.
 */
const grantMembershipTokens = async (
  uuid: string,
  subscription: Stripe.Subscription
) => {
  if (subscription.status !== 'active') {
    return; // paid and current only — trials and past-due/canceled grant nothing
  }
  const price = subscription.items.data[0]?.price;
  if (!price) return;
  const { data: priceRow } = await supabaseAdmin
    .from('prices')
    .select('product_id')
    .eq('id', price.id)
    .maybeSingle();
  if (!priceRow?.product_id) return;
  const { data: productRow } = await supabaseAdmin
    .from('products')
    .select('name')
    .eq('id', priceRow.product_id)
    .maybeSingle();
  const grant = membershipTokenGrant(productRow?.name);
  if (!grant) return; // not a membership (token pack, etc.)

  const periodStartIso = toDateTime(subscription.current_period_start).toISOString();
  const ref = membershipGrantRef(subscription.id, periodStartIso, price.id);
  const grantRank = membershipTierRank(grant.reason);

  // Already granted this period at this tier or higher? (repeat, renewal
  // re-fire, or a downgrade) — skip. An upgrade (higher rank) passes.
  const { data: existing } = await supabaseAdmin
    .from('token_ledger')
    .select('reason')
    .eq('user_id', uuid)
    .like('ref', `sub:${subscription.id}:${periodStartIso}:%`);
  const existingRank = Math.max(
    0,
    ...(existing ?? []).map((e) => membershipTierRank(e.reason))
  );
  if (existingRank >= grantRank) return;

  const { error } = await supabaseAdmin.from('token_ledger').insert({
    user_id: uuid,
    delta: grant.amount,
    reason: grant.reason,
    ref
  });
  if (error)
    console.error(`Membership grant failed: ${error.message}`);
  else
    console.log(
      `🎟️ Membership grant: +${grant.amount} (${grant.reason}) to ${uuid}`
    );
};

export {
  upsertProductRecord,
  upsertPriceRecord,
  deleteProductRecord,
  deletePriceRecord,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
  applyVerificationResult,
  handleVerificationFailure,
  creditTokenPurchase
};
