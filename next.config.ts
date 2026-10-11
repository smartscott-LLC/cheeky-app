import type { NextConfig } from 'next';
import { config } from 'dotenv';

// Load .env.new before any Next.js build phase reads process.env.
// Without this, NEXT_PUBLIC_ and server-side keys are missing during build.
config({ path: `${process.cwd()}/.env.new` });

const nextConfig: NextConfig = {
  // Ivy container builds need a self-contained server; Vercel ignores this.
  output: 'standalone',
  reactStrictMode: true,
  images: {
    // Owner-review 2026-10-11: HUD bucket icons were blocked by the image
    // optimizer (no remotePatterns → every <Image> on a bucket URL failed).
    // Supabase Storage host comes from env (never hardcoded); cdn domain is
    // the legacy asset host used by the lounge.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(
          process.env.NEXT_PUBLIC_SUPABASE_URL ??
            'https://ioqeddpgdilyyajsygmz.supabase.co'
        ).hostname
      },
      { protocol: 'https', hostname: 'cdn.smartscott.online' }
    ]
  }
};

export default nextConfig;
