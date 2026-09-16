# Config Audit — External Integrations Checklist

> One list, everything external. Anything marked **dashboard** needs a click
> in the respective console (only the founder can do these). Everything else
> is verified in code/repo. Work top to bottom; item 1 is the current
> blocker (email confirmation links point at localhost).

## 1. Supabase — Auth URL Configuration (dashboard) ⚠️ CURRENT BLOCKER

Project: `ioqeddpgdilyyajsygmz` → **Project Settings → Authentication → URL Configuration**

- **Site URL:** `https://smartscott.online`
  - _This is the bug: the project default is `http://localhost:3000`, so every
    email link Supabase sends (email confirmation, magic links, password
    reset) falls back to localhost. Setting this fixes them all at once._
- **Redirect URLs — add these three:**
  - `https://smartscott.online`
  - `https://smartscott.online/auth/callback`
  - `https://smartscott.online/auth/reset_password`

Result: email confirmation → `/auth/callback` → `/club` → velvet rope →
Brutus → the Door Check (Stripe Identity). Exactly the flow the founder wants:
confirm email, straight to the ID check.

## 2. Stripe (dashboard)

- **Identity enabled:** Stripe Dashboard → Identity → enable it. Required for
  the Door Check's hosted page to launch. (If "Start the check" errors, this
  is why.)
- **Webhook endpoint:** confirm it points at
  `https://smartscott.online/api/webhooks` and is enabled (the Vercel
  integration usually configures this; verify the webhook secret matches
  `STRIPE_WEBHOOK_SECRET`).
- **Test mode:** Identity checks on **live** keys are real charges. For
  practicing the Door Check without cost, use Stripe test-mode keys (or
  accept the per-check cost on the test card).

## 3. Vercel (dashboard)

- **Env vars:** confirm the 12 (see `.env.local.example`): the Supabase
  integration auto-added its three; ensure `NEXT_PUBLIC_SITE_URL` is
  `https://smartscott.online`.
- **Domain:** `smartscott.online` attached (site loads — confirmed).
- **PostHog token** still missing from Vercel (`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) — app runs fine without it; add when the new project exists.

## 4. Verified good (no action)

- Migrations: all 41 applied to the hosted DB; cron jobs live; founder +
  test accounts exist (Boss: Diamond/owner/verified; Stripe/Tester1 test card).
- Supabase keys: code accepts both old and new naming (`utils/supabase/keys.ts`).
- Password reset: handles both `?code` and `?token_hash` link formats.
- Email callback: code sends `smartscott.online/auth/callback` (Vercel build
  reads `NEXT_PUBLIC_SITE_URL` — the landing page renders the right URL).
- Stripe products/prices: 6/6 backfilled.
- Sentry: DSNs repointed at the recreated project (all four configs).
- PostHog client init: skips gracefully without a token.
