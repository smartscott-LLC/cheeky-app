// Sentry client config — captures browser errors. The DSN is public by
// design (Sentry's model); keep it in sync with sentry.server.config.ts.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ade41814bdf67d2d2b6b331b9cb48129@o4510949774983168.ingest.us.sentry.io/4511843672915968',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true
});
