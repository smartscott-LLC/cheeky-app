/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server actions receive profile photos (optimized headshots) — allow
  // uploads up to 10MB. (Next 15.5: this key lives under `experimental`.)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

// Sentry source-map support engages only when an auth token exists (Vercel,
// local). CI runs token-free — without a token, withSentryConfig would try
// to upload source maps and fail the build, so we skip it entirely.
const sentryToken = process.env.SENTRY_API_KEY ?? process.env.SENTRY_AUTH_TOKEN;

// The CLI's sourcemap upload warns about a handful of webpack chunk-loader
// stubs (empty module registrations) that carry Sentry debug ids but no
// sourcemap — webpack never emits maps for empty chunks, so no map can
// exist. Errors-only keeps the deploy logs clean without hiding anything
// real. (An explicit SENTRY_LOG_LEVEL still wins — used for debugging.)
if (sentryToken && !process.env.SENTRY_LOG_LEVEL) process.env.SENTRY_LOG_LEVEL = 'error';

module.exports = sentryToken
  ? require('@sentry/nextjs').withSentryConfig(nextConfig, {
      // The Vercel→Sentry integration injects SENTRY_ORG / SENTRY_PROJECT
      // into the build env — read them instead of hardcoding, so a project
      // re-link can't leave the build pointing at a dead slug (that was
      // failing source-map uploads on Vercel). Local fallbacks keep the
      // current working local setup untouched.
      org: process.env.SENTRY_ORG ?? 'smartscottcom-llc',
      project: process.env.SENTRY_PROJECT ?? 'cheeky-app',

      authToken: sentryToken,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // Upload a larger set of source maps for prettier stack traces.
      widenClientFileUpload: true,

      webpack: {
        automaticVercelMonitors: true,
        treeshake: {
          // Automatically tree-shake Sentry logger statements to reduce bundle size
          removeDebugLogging: true
        }
      }
    })
  : nextConfig;
