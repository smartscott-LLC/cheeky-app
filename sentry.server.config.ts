// Sentry server config — captures errors from API routes, server actions,
// and server components. Safe when no DSN is configured (no crash).
import * as Sentry from '@sentry/nextjs';

const dsn =
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1
  });
}
