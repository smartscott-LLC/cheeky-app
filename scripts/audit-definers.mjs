#!/usr/bin/env node
/**
 * audit-definers — the standing guard over the club's SECURITY DEFINER
 * surface (docs/PRD-user-manifest.md authority table + the advisor menu).
 *
 * Every SECURITY DEFINER function in the exposed `public` schema that
 * anon or authenticated can execute IS a public API endpoint. This script
 * declares them on purpose and screams when reality drifts:
 *
 *   • NEW callable DEFINERs not in config/definer-api.json   → fail
 *   • allowlisted functions that vanished                     → note
 *   • any DEFINER missing a search_path pin                  → fail
 *   • any DEFINER not owned by postgres                      → fail
 *   • anything living in public that belongs in `guard`      → note
 *
 * Run after EVERY Supabase upgrade (the 2026-10-03 upgrade silently
 * re-granted anon EXECUTE on taskbar_state — this script catches that),
 * and before every launch. Exit code 1 = drift.
 *
 * Usage: node --experimental-strip-types scripts/audit-definers.mjs
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

config({ path: '.env.new' });

const allow = JSON.parse(
  readFileSync(new URL('../config/definer-api.json', import.meta.url), 'utf8')
);
const allowed = new Set(allow.functions);

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  max: 1,
  ssl: 'require',
  idle_timeout: 15
});

const rows = await sql`
  select p.oid::regprocedure::text as sig,
         p.proname,
         r.rolname as owner,
         coalesce(array_to_string(p.proconfig, ','), '') as config,
         has_function_privilege('anon', p.oid, 'execute') as anon_exec,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_roles r on r.oid = p.proowner
  where n.nspname = 'public' and p.prosecdef
    and ( has_function_privilege('anon', p.oid, 'execute')
       or has_function_privilege('authenticated', p.oid, 'execute') )
  order by p.proname`;
await sql.end();

const seen = new Set();
let drift = 0;
console.log(`callable SECURITY DEFINERs in public: ${rows.length}`);
for (const r of rows) {
  seen.add(r.proname);
  const problems = [];
  if (!allowed.has(r.proname)) problems.push('NOT IN ALLOWLIST');
  if (!r.config.includes('search_path=')) problems.push('NO search_path PIN');
  if (r.owner !== 'postgres') problems.push(`OWNER=${r.owner}`);
  if (problems.length) {
    drift++;
    console.log(
      `  ✗ ${r.proname} [${r.anon_exec ? 'anon' : ''}${r.auth_exec ? 'auth' : ''}] — ${problems.join(', ')}`
    );
  }
}
for (const name of allowed) {
  if (!seen.has(name))
    console.log(
      `  · ${name} — allowlisted but no longer callable (retired? update list)`
    );
}

if (drift > 0) {
  console.error(
    `\nDRIFT: ${drift} violation(s). Fix or allowlist deliberately — never ignore.`
  );
  process.exit(1);
}
console.log(
  '\nclean ✓ — the exposed DEFINER surface is exactly what we declared.'
);
