# Club Cheeky — Third-Party Audit Brief (for Copilot / external reviewer)

> Hand this to an independent reviewer (e.g., Copilot in a sandbox) to run an
> exhaustive audit of the Club Cheeky platform. It should NOT assume prior
> knowledge — everything needed to start is below. Report findings back in
> the format at the bottom.

## What Club Cheeky is

A dating app built like a nightclub: verification-as-entry (free Silver tier),
live hourly events (the "Hourly Playlist"), a token economy spent on events
and gifts only (never messaging), and an AI concierge (the "Cast") — six
in-character personas. Product source of truth: `docs/PRD-foundation.md` and
`docs/PRD-phase5-wing.md`. Working guidelines: `AGENTS.md`.

## Stack (be precise — versions matter)

- Next.js 15.5 (App Router), TypeScript, Tailwind 3.4, React 18
- Supabase (Postgres, auth, storage) with **Row Level Security mandatory** on
  every table; security-definer RPCs for all writes
- Stripe (live mode — subscriptions, Identity verification, webhooks)
- AI: `ai` SDK v7 + `@ai-sdk/deepseek` (direct to api.deepseek.com with
  `DEEPSEEK_API_KEY`), Vercel AI Gateway fallback
- Deploys to Vercel on every push to `main` (production = `smartscott.online`)

## Repo map (top level)

```
app/            routes: /, /signin, /verify, /browse, /messages, /events
                (+/speed), /gifts, /account, /best-practices, /api/webhooks,
                /api/agent
components/     ui primitives + feature components (icons/, ui/)
utils/          supabase clients + queries, stripe server/client, auth helpers,
                agent/ (AI clients)
supabase/       migrations (15+ files — the schema source of truth)
scripts/        dev utilities (migrate-hosted, backfill, check-schema)
styles/         main.css + floor palettes (styles/palettes/*.scss)
docs/           PRDs + Governance/ (terms, privacy, safety, retention, refunds,
                best-practices — binding on the build)
public/         personas/{slug}/ art + floors/*.png
types_db.ts     generated Supabase types (regenerate after schema changes)
```

## Known loose ends (verified — do NOT re-report these as new)

- **Photo upload**: FIXED 2026-08-02 (was a 413 body-size config + client
  error handling). Verified working (3 photos, storage confirmed).
- **Navbar centering**: FIXED 2026-08-02.
- **subscriptions.created_at**: FIXED (migration applied).
- **Footer legal links**: `Privacy Policy` and `Terms of Use` in the footer
  point to `/` (homepage) — the actual `/privacy` and `/terms` pages DO NOT
  EXIST yet. This is a KNOWN gap, not a discovery.

## Audit checklist (what to verify)

1. **Routes & links** — every route renders (no 500s), every nav/footer link
   resolves, no dead anchors, no orphaned redirects (`/signin/*` views,
   `/auth/callback`, middleware).
2. **RLS audit** — every public table: is RLS enabled? Are policies
   least-privilege? Are there tables with no policies (deny-by-default)?
   Check: profiles, photos, consents, token_ledger, events, event_entries,
   event_picks, matches, likes, conversations, messages, blocks, reports,
   gift_catalog, gift_inventory, gift_sends, date_rooms, club_announcements,
   characters, character_relations, certificates, special_interests,
   date_nights, date_night_picks, center_stage, miss_streaks.
3. **Server actions & RPCs** — do any trust client input that should be
   server-validated (positions, counts, tiers)? Any SQL injection patterns?
   Any RPC with missing auth.uid() guards?
4. **Token economy** — can a client insert/update token_ledger? Are event
   holds (not debits) correct? Refund paths on no-match/cancel?
5. **AI layer** — `/api/agent`: auth required? history capped? system prompt
   injection risks (persona_prompt is admin-controlled, message is
   user-controlled — is the boundary clean)? Key handling server-only?
6. **Stripe** — webhook signature verification? idempotency? live vs test
   key hygiene?
7. **Auth** — signup consent flow (terms/privacy/best-practices recorded in
   `consents`), 18+ gate, password reset, session middleware.
8. **Accessibility/UX pass** — contrast, focus states, mobile overflow
   (desktop-first is accepted; total breakage is not).
9. **Build health** — `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` all
   pass. No template leftovers ("ACME", "Subscription Starter",
   "vercel.com" branding in app code).
10. **Performance** — bundle sizes from build output, unoptimized images
    (plain `<img>` warnings are known/accepted for now), N+1 query patterns.

## Report format (bring results back in this shape)

Per finding:
- **Severity**: Critical / High / Medium / Low / Nit
- **Area**: route / RLS / action / AI / stripe / auth / UX / build / perf
- **What**: the exact issue
- **Where**: file or route (be specific)
- **Repro**: how you confirmed it
- **Suggested fix**: your recommendation

Also include:
- **Working-well list** (what surprised you positively)
- **Enhancement suggestions** (ranked — things we didn't see)
- **Answer to**: "Is anything about the architecture that will hurt us at
  scale, and what's the cheapest fix now?"

## Notes

- Do NOT expose or echo secrets (keys in env files are real — live Stripe,
  hosted Supabase, DeepSeek).
- The app is live at smartscott.online — public pages can be crawled; authed
  flows need test accounts (ask the founder).
- Governance docs in `docs/Governance/` are binding — flag any code that
  violates them (no dark patterns, refunds policy, no-follow-up rule,
  retention windows).
