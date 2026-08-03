import Link from 'next/link';

import { CONTACT } from '@/utils/contact';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-[1920px] px-6 bg-zinc-900">
      <div className="grid grid-cols-1 gap-8 py-12 text-white transition-colors duration-150 border-b lg:grid-cols-12 border-zinc-600 bg-zinc-900">
        <div className="col-span-1 lg:col-span-3">
          <Link
            href="/"
            className="flex items-center flex-initial md:mr-24"
          >
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
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/#membership"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Membership
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/signin"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Sign in
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/account"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Account
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/swag"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Swag Shop
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/coat-check"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Coat Check
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <p className="font-bold text-white transition duration-150 ease-in-out hover:text-zinc-200">
                LEGAL
              </p>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/privacy"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Privacy Policy
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/best-practices"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Best Practices
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/terms"
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Terms of Use
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <p className="font-bold text-white transition duration-150 ease-in-out hover:text-zinc-200">
                CONTACT
              </p>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <a
                href={`mailto:${CONTACT.info}`}
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                {CONTACT.info}
              </a>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <a
                href={`mailto:${CONTACT.helpdesk}`}
                className="text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                {CONTACT.helpdesk}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between py-12 space-y-4 md:flex-row bg-zinc-900">
        <div>
          <span>
            &copy; {new Date().getFullYear()} Club Cheeky. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
