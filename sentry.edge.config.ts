// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Public by design (see sentry.server.config.ts).
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://6aaf79deeb5b8a2e119e502317a67802@o4511848259715072.ingest.us.sentry.io/4511848262795265',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  // Suppress noisy internal calls from the Supabase JS SDK v2.x that probe
  // non-existent PostgREST endpoints. These generate 404/401 traffic that
  // floods Sentry but has zero impact on the app.
  beforeSend(event) {
    if (event.request) {
      const url = event.request.url;
      if (
        url?.includes('/rest/v1/config/migrations') ||
        url?.includes('/rest/v1/rpc/supabase_migrations') ||
        url === '/rest/v1/'
      ) {
        return null;
      }
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.filter((b) => {
        const msg = (b.message as string | undefined) || '';
        const cat = b.category || '';
        return !(
          (cat === 'fetch' || cat === 'xhr') &&
          (msg.includes('/rest/v1/config/migrations') ||
            msg.includes('/rest/v1/rpc/supabase_migrations') ||
            msg === 'GET /rest/v1/')
        );
      });
    }
    return event;
  },
});
