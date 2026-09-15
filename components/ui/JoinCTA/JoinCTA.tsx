'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * "Join for Free" button — ONLY shows on the landing page (/).
 * Never renders anywhere else.
 */
export default function JoinCTA({ verified }: { verified: boolean }) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // Only show on landing page, never inside the club
  if (pathname !== '/') return null;
  if (verified) return null;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/verify"
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full border-2 border-gold bg-zinc-950/95 px-5 py-3 text-sm font-bold text-gold shadow-[0_0_24px_rgba(255,215,0,0.25)] transition-all hover:bg-zinc-900 hover:scale-105"
    >
      <span className="text-lg">🎫</span>
      <span>Join for Free</span>
    </Link>
  );
}
