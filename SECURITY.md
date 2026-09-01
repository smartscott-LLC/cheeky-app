# Security Policy

Club Cheeky takes the safety of its members and the integrity of its
platform seriously — it's the whole brand. If you've found something, we
want to hear about it.

## Supported versions

Only the current production deployment (`main` → smartscott.online) is
supported. Everything else is development-only and unsupported.

| Version                    | Supported |
| -------------------------- | --------- |
| Production (live main)     | ✅        |
| Feature branches / staging | ❌        |

## Reporting a vulnerability

**Please do NOT open a public issue for security problems.** Report privately:

1. **GitHub private vulnerability reporting** (preferred):
   Repository → **Security** tab → **Report a vulnerability**.
2. Or email the founder directly: _(founder to add a security contact email
   here — e.g. security@yourdomain)_

### What to include

- What you found and where (route, file, or endpoint)
- How to reproduce it, step by step
- What you expected vs. what happened
- Any impact you believe it has (data exposure, privilege escalation, etc.)

### What to expect

- **Acknowledgment within 48 hours** — a human reads every report.
- We'll triage: severity, impact, and a fix plan.
- We keep you updated as we work, and we credit you if you want the credit
  (or stay quiet if you don't).
- If we accept the report, we fix it and ship it. If we decline it, we tell
  you why.

## What we already do

- Row Level Security on every table; service-role keys are server-only.
- Verification-as-entry (Stripe Identity) with no stored ID documents.
- Tokens are a server-side ledger — never trusted from the client.
- Stripe webhooks are signature-verified and replay-protected.
- Secrets live in environment variables, never in the repo or client bundle.

## Bug bounty

We're a bootstrapped club. No paid bounty yet — but reporters get our
genuine thanks, a credit in the release notes (if wanted), and a VIP badge
if they're a member. We'll revisit a bounty program when revenue allows.
