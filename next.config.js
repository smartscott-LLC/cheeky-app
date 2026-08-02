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
const sentryToken =
  process.env.SENTRY_API_KEY ?? process.env.SENTRY_AUTH_TOKEN;

module.exports = sentryToken
  ? require('@sentry/nextjs').withSentryConfig(nextConfig, {
      org: 'smartscottcom-llc',
      project: 'cheeky-app',

      authToken: sentryToken,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // Upload a larger set of source maps for prettier stack traces
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
