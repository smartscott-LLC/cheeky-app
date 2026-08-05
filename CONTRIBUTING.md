# Contributing to Club Cheeky

How work happens in this repo — the discipline that keeps a production push safe.
`AGENTS.md` is the working guidelines; this file is the _process_.

## The standing rule

**Every push to `main` is production** (auto-deploys to Vercel). Before any commit:

```sh
pnpm lint        # zero warnings or errors
pnpm test        # safe test suite (unit tests; live suites skip without RUN_LIVE_TESTS=1)
pnpm build       # production build, green
```

Then manually exercise the affected flow (auth / verification / checkout / event) on the live
app. No exceptions — a bad push goes live.

## How work lands

1. **PRD first.** Product decisions land in `docs/` (`PRD-foundation.md` or a feature PRD) before
   code. If a decision changes, update the doc and the code together.
2. **Surgical changes.** In existing code, do exactly what the task asks — no opportunistic
   refactors, no renamed files/variables unless the task calls for it.
3. **Ask when it's ambiguous.** When a product decision is unclear, ask rather than inventing an
   answer that contradicts the PRD.
4. **Commit early, commit often** — with messages that say _what and why_ (the repo averages a
   commit every ~30 minutes during active builds).

## Commit messages

Conventional prefix + what-and-why body:

```
feat(area): summary of what changed
fix(area): what broke and why this fixes it
docs(area): ...
ci(area): ...
chore(area): ...

Body: the "why" — context a future reader can't see from the diff.
```

Prefixes seen in this repo: `feat`, `fix`, `docs`, `ci`, `chore`, `skin-pass`, `nav`, `copy`.
For big changes, note what was verified (e.g. "build green", "verified live").

## Schema changes (the hosted workflow)

There is **no local database** — everything targets the hosted Supabase project.

1. Write a numbered migration: `supabase/migrations/<timestamp>_<name>.sql`
   (e.g. `20260804050000_rate_limits.sql`).
2. Apply it to the hosted DB: `node scripts/migrate-hosted.mjs <name-part>`
3. Regenerate the types: `pnpm supabase:generate-types` — commit the `types_db.ts` diff.
4. If behavior changed, add/refresh a test (see Testing below).
5. Lint + test + build, then commit.

Rules: **RLS on every table** (never "just for now"); service role server-only; the client only
ever uses the anon key; money/tokens are server-side ledger deltas only — never trust the client.

## Testing

`tests/` runs on Node's built-in `node:test` — zero extra dependencies.

- **Safe** (`pnpm test`, runs in CI): pure logic — e.g. `parseTokenAmount` pins the webhook's
  token-credit rule.
- **Live** (`RUN_LIVE_TESTS=1`): webhook handlers (signature, idempotency, burst), the token
  engine (exact credits, N-way concurrent joins via `STRESS_N`, no over-commit), and the DeepSeek
  burst probe. Live tests hit production with throwaway members and clean up after themselves.

Run the full token-engine burst before anything that touches events/tokens:

```sh
RUN_LIVE_TESTS=1 STRESS_N=1000 node --test tests/token-engine.live.test.mjs
```

See `tests/README.md` for the full matrix.

## Environment & secrets

- **`env.new` is the master vault** — gitignored, never commit it. Every script and live test
  reads it directly (`config({ path: 'env.new' })`), so there is exactly one source of truth.
- `.env.local` exists only for `pnpm dev` locally (Next auto-loads it). It is a generated
  copy: `node scripts/sync-env.mjs` refreshes it from `env.new`. Never hand-edit `.env.local`.
- Only public keys (`NEXT_PUBLIC_*`) may appear in tracked files or CI.
- The env reference is `docs/ENVIRONMENT.md`; `.env.local.example` is the scaffold for a fresh
  clone. If you add an env var, update both.

## Branching, tagging, and safety valves

- **`main` is always current.** During build-out there's no PR ceremony — the safety valves are
  git history and milestone tags.
- When an area is fluid and testable, **tag it as a save point** (`v0.1-floor-1-locked`,
  `v1.0-den-locked`, `v1.1-docs-locked`, …). Future work can reset to any tag.
- Cut per-area branches (`feat/floor-1`) for the _next_ area and merge back when fluid. Tag
  before cutting so the branch has a safe anchor.
- Never rewrite pushed history on `main`.

## Definition of done

- [ ] Lint clean, safe tests pass, build green
- [ ] Migration applied to hosted + `types_db.ts` regenerated (if schema touched)
- [ ] Affected flow manually verified on the live app
- [ ] Docs updated: PRD / governance / floor map / changelog / README as appropriate
- [ ] Changelog entry added under `[Unreleased]` (what-and-why, user/operator-facing)
- [ ] No secrets in the diff (grep for `sk_live`, `sk-or-v1`, `whsec_`, `re_iCx`, `phc_`)
