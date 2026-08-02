Club Cheeky — Comprehensive Audit Report

Generated: 2026-08-02 16:12:00 -05:00
Scope: full repository review focused on security, data integrity, Supabase RLS, Stripe webhooks, token ledger, build/CI health, and production readiness.

Executive summary
-----------------
The codebase is well-structured: Next.js App Router, Supabase-backed Postgres with RLS, Stripe for billing and Stripe Identity, and an event engine for the core product. Migrations demonstrate a consistent security-first approach (RLS enabled for major tables). Immediate hardening and fixes were implemented in this session (webhook idempotency table + atomic RPC, per-user token balance in the AI agent route, and a SECURITY DEFINER RPC for token_ledger writes). These changes are in the branch for review.

However, recent commits introduced build failures in PR checks (CI/Vercel). Those failures are most likely caused by one or more of the following: server-only code referenced in client bundles, un-applied DB migrations referenced at runtime, missing environment variables at build time, or TypeScript/type errors. Because this repo deploys live (smartscott.online), any PR that affects build/runtime must be validated in a safe staging/dev environment, with migrations applied before runtime execution.

Key findings and evidence
-------------------------
The findings below are grouped by severity with actionable remediation for each.

Critical / High
----------------
1) Incorrect token balance calculation (fixed)
- What: Agent route summed token_ledger.delta across the whole table instead of scoping by user_id.
- Where: app/api/agent/route.ts (ledger query before balance calculation).
- Why it matters: Users may see incorrect token balances, causing UX confusion and potential financial errors in token gating.
- Fix implemented: query now filters by user_id.
- Test: Add unit test asserting per-user balance from sampled token_ledger rows.

2) Token ledger write path must be server-only and auditable (implemented RPC)
- What: token_ledger stores currency changes; direct client writes must be prevented.
- Where: supabase/migrations/20260801033036_phase1_club_floor.sql (table), utils/supabase/admin.ts (server writes), various migrations and scripts insert into token_ledger.
- Risk: If any client path can write token_ledger, funds can be misissued.
- Fix implemented: added migration supabase/migrations/20260802162000_token_ledger_sproc.sql creating public.add_token_delta(...) SECURITY DEFINER and updated applyVerificationResult to call it. Revoke public execute. This centralizes validation and idempotency for grants like verification_bonus.
- Action required: convert other server-side insertors (scripts and migrations that seed token_ledger) to use RPCs or run them with service-role SQL only. Add an audit trigger to token_ledger if desired.

3) Webhook duplicate processing (implemented atomic RPC)
- What: Stripe webhooks can be retried; duplicate processing can cause double grants/duplicate subscription handling.
- Where: app/api/webhooks/route.ts
- Fix implemented: created webhook_events table and atomic RPC mark_webhook_processed(...) (SECURITY DEFINER) and route updated to call RPC before processing. Added test script scripts/test-webhook-duplicate.mjs to replay identical events.
- Remaining: ensure migration applied in dev/prod before deployment; add CI integration test that replays a fabricated event (requires secrets and test user).

Medium
------
4) Build & CI failures after recent edits
- Observed: PR checks failing on Vercel/CI. Likely causes:
  - server-only env variables referenced during build (e.g., service role key, Stripe secret) leading to undefined or runtime errors in code paths executed at build time.
  - server-side modules imported into files bundled for the client (e.g., importing supabaseAdmin in components or client code). The repo uses server/client separation, but a small accidental import may pull server-only code into client bundle and crash build.
  - migrations or RPC usage assumed to exist at runtime but not yet applied in the environment.
- Action: collect build logs (first ~200 lines) to get exact TypeScript/Next/Vite errors. See "Immediate next steps".

5) AI persona prompt governance
- What: persona prompts (persona_prompt) are stored in DB and concatenated into system prompts. If editable by non-admins, they can inject harmful instructions.
- Where: app/api/agent/route.ts — persona_prompt retrieval and system prompt composition.
- Fix: ensure persona_prompt is admin-managed; add DB-level ACL or server-only editing flows; add server-side sanitization/validation.

6) Logging and observability
- Many console.log/error statements across server code. Replace with structured logging (pino/winston) and integrate error monitoring (Sentry) to avoid secret leakage and add alerts for webhook failures, token anomalies, and RPC errors.

Low / Suggestions
-----------------
- Add PR and merge gating: require CI checks pass, require at least one reviewer, and block merges to main unless migrations are applied and/or reviewed.
- Add Dependabot for dependency vulnerability alerts and a scheduled `npm audit` or Snyk check.
- Add privacy/legal pages referenced in footer before exposing to production.

Repro & evidence pointers (file list)
-------------------------------------
- app/api/agent/route.ts — token balance query (fixed in branch).
- app/api/webhooks/route.ts — webhook route (updated to call RPC).
- utils/supabase/admin.ts — supabaseAdmin creation and RPC calls (add_token_delta, mark_webhook_processed helpers).
- supabase/migrations/* — migrations for tables, RLS, new sproc and webhook tables.
- scripts/test-webhook-duplicate.mjs — test helper to replay webhook events.
- .github/workflows/ci.yml — CI workflow added to run pnpm install, lint, tsc, build, and a gated migration+integration job.

Why recent PR checks fail (most likely)
--------------------------------------
- Build-time evaluation of server-only code: Next.js builds both server and client; any import of server-only modules into client code will fail or expose server-only envs. The branch added server-side RPC calls and exports; check that none of those server-only exports were imported into client components. The most common pattern: utils/supabase/admin.ts must never be imported by client code (always use utils/supabase/client.ts or server-only wrappers).
- Unapplied migrations: The code calls RPCs (mark_webhook_processed, add_token_delta). If the deployed environment hasn’t had the migrations applied, the Next runtime will throw RPC-not-found errors. Ensure migrations are applied prior to deploying new code that references them.
- Missing env vars in build environment: process.env.SUPABASE_SERVICE_ROLE_KEY and STRIPE_WEBHOOK_SECRET must not be referenced in code executed at build time. Confirm these vars are used only in server-runtime code.

Immediate next steps (exact, copy/paste executable guidance)
-----------------------------------------------------------
1) Do NOT merge the PR until migrations are applied to the target environment.
2) Add required secrets to Vercel / GitHub Actions:
   - SUPABASE_SERVICE_ROLE_KEY (service role key; server-only)
   - STRIPE_WEBHOOK_SECRET (webhook secret)
   - TEST_USER_ID (for integration replay in CI, optional)
3) Run migrations in dev (locally or CI):
   - Locally (safe dev flow):
     corepack enable && corepack prepare pnpm@latest --activate
     pnpm install
     pnpm supabase:start    # optional local DB
     pnpm supabase:push      # apply new migrations
   - CI: set SUPABASE_SERVICE_ROLE_KEY in repo secrets and run supabase db push in a safe job (see .github/workflows/ci.yml)
4) Run tests and build:
   corepack enable && corepack prepare pnpm@latest --activate
   pnpm install
   pnpm tsc --noEmit
   pnpm lint
   pnpm build
5) Integration webhook replay (after migration applied):
   node ./scripts/test-webhook-duplicate.mjs <STRIPE_WEBHOOK_SECRET> <TEST_USER_ID>

If you prefer I finish the fixes in the branch
----------------------------------------------
Options:
A) You want me to revert my changes immediately (I can revert specific commits). Not recommended — better to fix the failing checks.
B) I continue implementing fixes iteratively until CI passes: I will
   - Run a server/client import sweep and correct accidental imports
   - Convert remaining token_ledger insert sites (scripts/migrations) to use RPC or secure server-run scripts
   - Add small defensive guards around process.env references to avoid build-time evaluation
   - Run CI and fix problems until green
This approach requires either CI logs or the ability to run the build in this environment. I attempted to run pnpm earlier but pnpm not installed here; CI will run the workflow once secrets are set.

Deliverables I will add to the PR (requested)
---------------------------------------------
- docs/AUDIT-REPORT-FULL.md (this file) — added to the branch for review.
- scripts/test-webhook-duplicate.mjs — test for idempotency (already added).
- migrations for webhook_events, mark_webhook_processed RPC, and add_token_delta RPC (already added).
- CI workflow .github/workflows/ci.yml that runs build and a gated migration+integration job (already added).

Repository-level merge checklist (must be green before merging to main)
------------------------------------------------------------------------
- [ ] CI: tsc --noEmit passes
- [ ] CI: pnpm lint passes
- [ ] CI: pnpm build passes
- [ ] Migrations: webhook_events and token_ledger RPC applied to the environment (dev/staging) and verified
- [ ] Integration: webhook duplicate replay test passes in staging
- [ ] Security: service-role key is stored in secrets; no client bundles import server-only modules
- [ ] Review: persona_prompt governance decision recorded and implemented (admin-only)

What I did in this session (concise)
-----------------------------------
- Implemented fixes and hardening for token accounting and webhook idempotency and added corresponding migrations, RPCs, and tests.
- Added CI workflow to run build and gated migration+integration job.
- Created PR with the changes (include audit report file).

Next move
---------
- I added this audit to the open PR branch (docs/AUDIT-REPORT-FULL.md). Please download it for external review or hand to DeepSeek if you prefer.
- If you want me to continue and try to bring the PR to green, say so and provide either:
  1) the failing CI / Vercel build logs (paste first ~200 lines) — I’ll triage and fix, or
  2) permission to run the repo’s CI workflow (add required secrets) so I can iterate against real build logs.

If you want this audit converted into a formal issue checklist or a separate PR for each fix, I will split it accordingly.

-- End of report
