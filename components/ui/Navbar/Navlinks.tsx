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
  isOwner?: boolean;
}

/**
 * The nav is the marquee, not the menu. The club's rooms live INSIDE the
 * club (/club) — the nav only carries the door: sign in, enter, account.
 * No event links, no floor links — those are found by walking the room.
 */
export default function Navlinks({ user, isOwner = false }: NavlinksProps) {
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

  // The marquee button switches: on the street it's the door, inside the
  // club it's the way back to the lobby.
  const onTheStreet = pathname === '/' || pathname.startsWith('/signin');

  return (
    // Three-zone grid: logo / crew / door. The crew pill lives in the flow
    // (not absolutely centered) so it can never overlap the right links.
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-3 md:py-4">
      <div className="flex items-center justify-start">
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
      {/* Meet the crew — dead center, the club's people are its face */}
      <Link
        href="/crew"
        className="hidden rounded-full border border-gold/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold transition hover:border-gold hover:bg-gold/10 md:inline-flex"
      >
        Meet the Crew
      </Link>
      <nav className="flex items-center justify-end gap-1 lg:gap-2">
        {/* Mobile: the crew link rides with the rest of the links */}
        <Link href="/crew" className={`${s.link} md:hidden`}>
          Meet the Crew
        </Link>
        {user ? (
          <>
            {/* The Lions Den — the owner's cockpit, only on the owner's marquee */}
            {isOwner && (
              <Link href="/owner" className={s.link} title="The Lions Den">
                🦁 Den
              </Link>
            )}
            {/* The Exchange — cards and tokens, on every floor */}
            <Link href="/store" className={s.link} title="Buy cards & tokens">
              <span className="lg:hidden">🪙</span>
              <span className="hidden lg:inline">🪙 The Exchange</span>
            </Link>
            <Link href="/account" className={s.link}>
              Account
            </Link>
            <Link
              href="/club"
              className="rounded-lg bg-club px-5 py-2 text-sm font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              {onTheStreet ? 'Enter the club' : 'Lobby'}
            </Link>
            <form onSubmit={handleSignOut}>
              <input type="hidden" name="pathName" value={pathname} />
              <button type="submit" className={s.link}>
                Sign out
              </button>
            </form>
            <Link href="/swag" className={s.link} title="Swag Shop">
              <span className="lg:hidden">🎟️</span>
              <span className="hidden lg:inline">🎟️ Swag Shop</span>
            </Link>
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
