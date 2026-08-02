'use client';

import Link from 'next/link';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import Logo from '@/components/icons/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import s from './Navbar.module.css';

interface NavlinksProps {
  user?: any;
}

export default function Navlinks({ user }: NavlinksProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative flex flex-row justify-between py-4 align-center md:py-6">
      <div className="flex items-center flex-1">
        <Link href="/" className={s.logo} aria-label="Club Cheeky home">
          <Logo />
          <span className="ml-2 text-lg font-bold text-white">Club Cheeky</span>
        </Link>
        <nav className="ml-6 space-x-2 lg:block">
          <Link href="/#membership" className={s.link}>
            Membership
          </Link>
          {user && (
            <>
              <Link href="/browse" className={s.link}>
                Browse
              </Link>
              <Link href="/events" className={s.link}>
                Dance Floor
              </Link>
              <Link href="/events/speed" className={s.link}>
                Speed Dating
              </Link>
              <Link href="/gifts" className={s.link}>
                Gifts
              </Link>
              <Link href="/messages" className={s.link}>
                Messages
              </Link>
              <Link href="/account" className={s.link}>
                Account
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="flex justify-end space-x-8">
        {user ? (
          <form
            onSubmit={(e) =>
              handleRequest(
                e,
                SignOut,
                getRedirectMethod() === 'client' ? router : null
              )
            }
          >
            <input type="hidden" name="pathName" value={pathname} />
            <button type="submit" className={s.link}>
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/signin" className={s.link}>
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
