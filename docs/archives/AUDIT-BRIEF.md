# Club Cheeky — Audit Orientation (for an independent reviewer)

> Hand this to an external reviewer (e.g., Copilot) as **orientation only**.
> This is a README about the codebase so the reviewer can find things. It is
> NOT a scope, NOT a checklist, and NOT a list of what to look at.

## The app

Club Cheeky is a dating app built like a nightclub: free verified entry
(Silver tier, ID check), live hourly events (the "Hourly Playlist" —
Dance Floor, Themed Night, Speed Dating, Rooftop), a token economy spent on
events and gifts only, and an AI concierge (the "Cast") — six in-character
personas powered by DeepSeek. It is live in production at:
**https://smartscott.online**

Product source of truth: `docs/PRD-foundation.md`, `docs/PRD-phase5-wing.md`.
Working guidelines: `AGENTS.md`. Governance (binding): `docs/Governance/`.

## Stack

- Next.js 15.5 (App Router), TypeScript, Tailwind 3.4, React 18
- Supabase: Postgres, auth, storage; Row Level Security on tables;
  security-definer RPCs for writes
- Stripe (live): subscriptions, Identity verification, webhooks
- AI: `ai` SDK v7 + `@ai-sdk/deepseek` (direct to api.deepseek.com),
  Vercel AI Gateway fallback
- Deploys to Vercel on every push to `main`

## Repo map

```
app/            routes: /, /signin/*, /verify, /browse, /messages/*, /events
                (+/speed), /gifts, /account, /best-practices, /api/webhooks,
                /api/agent
components/     UI (icons/, ui/)
utils/          supabase, stripe, auth helpers, agent/
supabase/       migrations/ (schema source of truth)
scripts/        dev utilities
styles/         main.css + palettes
docs/           PRDs + Governance/
public/         personas/{slug}/, floors/
types_db.ts     generated Supabase types
```

## Audit instruction

**This is an exhaustive, executive audit. Report EVERYTHING you find.**

- Every issue, no matter how small — typos, misspelled words, out-of-order
  things, visual glitches, dead code, unused imports, naming inconsistencies.
- Issues you believe are "already known." We want the complete picture, not a
  filtered one. Do not skip anything because you think someone already knows.
- Do not filter by severity, by area, or by your guess of what matters.
  Report it all. We will triage.
- If something looks broken, confirm it and tell us exactly where.
- If something works surprisingly well, say so.

## Practical notes

- Do NOT echo, print, or commit secrets. Env files contain real live keys
  (Stripe, Supabase, DeepSeek, OIDC). Reference them by name only.
- Public pages can be crawled. Authenticated flows need test accounts — ask
  the founder for credentials.
- The review should cover the whole codebase and the whole running app —
  routes, database, server actions, integrations, UI, docs.
