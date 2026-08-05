// One-time backfill: syncs active products + prices from Stripe into the
// hosted DB (normally done by the webhook; needed because the products
// predate the webhook wiring).
// Usage: node scripts/backfill-stripe-products.mjs
import { config } from 'dotenv';
import postgres from 'postgres';
import Stripe from 'stripe';

config({ path: 'env.new' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sql = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  max: 1,
  ssl: 'require'
});

try {
  const [products, prices] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.prices.list({ active: true, limit: 100 })
  ]);

  let p = 0;
  for (const prod of products.data) {
    await sql`
      insert into public.products (id, active, name, description, image, metadata)
      values (
        ${prod.id}, ${prod.active}, ${prod.name}, ${prod.description},
        ${prod.images?.[0] ?? null}, ${prod.metadata}
      )
      on conflict (id) do update set
        active = excluded.active,
        name = excluded.name,
        description = excluded.description,
        image = excluded.image,
        metadata = excluded.metadata
    `;
    p++;
  }

  let pr = 0;
  for (const price of prices.data) {
    const productId = typeof price.product === 'string' ? price.product : '';
    await sql`
      insert into public.prices (
        id, product_id, active, description, currency, type, interval,
        interval_count, trial_period_days, unit_amount, metadata
      )
      values (
        ${price.id}, ${productId}, ${price.active}, ${price.nickname ?? null},
        ${price.currency}, ${price.type}, ${price.recurring?.interval ?? null},
        ${price.recurring?.interval_count ?? null},
        ${price.recurring?.trial_period_days ?? null},
        ${price.unit_amount ?? null}, ${price.metadata}
      )
      on conflict (id) do update set
        product_id = excluded.product_id,
        active = excluded.active,
        unit_amount = excluded.unit_amount,
        interval = excluded.interval,
        interval_count = excluded.interval_count,
        currency = excluded.currency,
        type = excluded.type
    `;
    pr++;
  }

  console.log(`Backfilled ${p} products, ${pr} prices.`);
} finally {
  await sql.end();
}
