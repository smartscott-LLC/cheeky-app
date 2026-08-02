/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server actions receive profile photos (optimized headshots) — allow
  // uploads up to 10MB.
  serverActions: {
    bodySizeLimit: '10mb'
  }
};

module.exports = nextConfig;
