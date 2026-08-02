// Sentry client config — captures browser errors. The DSN is public by
// design (Sentry's model); a missing DSN is safe (no init, no crash).
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1
  });
}
