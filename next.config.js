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

module.exports = nextConfig;
