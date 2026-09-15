'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * A sticky floating "Join for Free" button that hovers bottom-right.
 * Only shows on landing (/) and pricing pages for unverified guests.
 * Disappears once you're verified or on any internal page.
 */
export default function JoinCTA({ verified }: { verified: boolean }) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // Only show on landing and pricing pages
  const allowedPaths = ['/', '/pricing'];
  const isAllowedPath = allowedPaths.includes(pathname);

  useEffect(() => {
    // Delay mount so it doesn't flash on first paint
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (verified || !visible || !isAllowedPath) return null;

  return (
    <Link
      href="/verify"
      className="fixed bottom-6 right-24 z-[9999] flex items-center gap-2 rounded-full border-2 border-gold bg-zinc-950/95 px-5 py-3 text-sm font-bold text-gold shadow-[0_0_24px_rgba(255,215,0,0.25)] transition-all hover:bg-zinc-900 hover:scale-105"
    >
      <span className="text-lg">🎫</span>
      <span>Join for Free</span>
    </Link>
  );
}
