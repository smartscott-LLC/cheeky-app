// Dev utility: lists public tables on the HOSTED database.
// Usage: node scripts/check-schema.mjs
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  max: 1,
  ssl: 'require'
});

try {
  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log(tables.map((t) => t.table_name).join(', '));
} finally {
  await sql.end();
}
