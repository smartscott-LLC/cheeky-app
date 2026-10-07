import type { NextConfig } from 'next';
import { config } from 'dotenv';

// Load .env.new before any Next.js build phase reads process.env.
// Without this, NEXT_PUBLIC_ and server-side keys are missing during build.
config({ path: `${process.cwd()}/.env.new` });

const nextConfig: NextConfig = {
  // Ivy container builds need a self-contained server; Vercel ignores this.
  output: 'standalone',
  reactStrictMode: true
};

export default nextConfig;
