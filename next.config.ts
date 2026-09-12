import type { NextConfig } from 'next';
import { config } from 'dotenv';

// Load .env.new before any Next.js build phase reads process.env.
// Without this, NEXT_PUBLIC_ and server-side keys are missing during build.
config({ path: `${process.cwd()}/.env.new` });

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
