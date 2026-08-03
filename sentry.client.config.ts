// Sentry client config — captures browser errors. The DSN is public by
// design (Sentry's model); keep it in sync with sentry.server.config.ts.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://6aaf79deeb5b8a2e119e502317a67802@o4511848259715072.ingest.us.sentry.io/4511848262795265',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true
});
