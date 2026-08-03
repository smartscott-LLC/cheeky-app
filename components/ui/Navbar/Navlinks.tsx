'use client';

import Link from 'next/link';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import posthog from 'posthog-js';
import { type FormEvent, useEffect } from 'react';
import s from './Navbar.module.css';

interface NavlinksProps {
  user?: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
}

/**
 * The nav is the marquee, not the menu. The club's rooms live INSIDE the
 * club (/club) — the nav only carries the door: sign in, enter, account.
 * No event links, no floor links — those are found by walking the room.
 */
export default function Navlinks({ user }: NavlinksProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user?.id) return;

    posthog.identify(user.id, {
      ...(user.email ? { email: user.email } : {}),
      ...(typeof user.user_metadata?.full_name === 'string'
        ? { name: user.user_metadata.full_name }
        : {})
    });
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);

  const handleSignOut = async (e: FormEvent<HTMLFormElement>) => {
    const result = await handleRequest(
      e,
      SignOut,
      getRedirectMethod() === 'client' ? router : null
    );
    posthog.reset();
    return result;
  };

  return (
    <div className="relative flex items-center justify-between py-3 md:py-4">
      <div className="flex items-center">
        <Link href="/" className={s.logo} aria-label="Club Cheeky home">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold shadow-[0_0_14px_rgba(255,215,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/entrance.png"
              alt="Club Cheeky entrance"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="font-script ml-2.5 bg-gradient-to-r from-gold via-gold-royal to-gold bg-clip-text text-2xl leading-none text-transparent">
            Club Cheeky
          </span>
        </Link>
      </div>
      <nav className="flex items-center gap-1 lg:gap-2">
        {user ? (
          <>
            <Link href="/account" className={s.link}>
              Account
            </Link>
            <Link
              href="/club"
              className="rounded-lg bg-club px-5 py-2 text-sm font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              Enter the club
            </Link>
            <form onSubmit={handleSignOut}>
              <input type="hidden" name="pathName" value={pathname} />
              <button type="submit" className={s.link}>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/#membership" className={s.link}>
              Membership
            </Link>
            <Link href="/signin" className={s.link}>
              Sign In
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
