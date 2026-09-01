import type { MetadataRoute } from 'next';

import { getURL } from '@/utils/helpers';

const LAST_MOD = '2026-08-05';

// Every public page. Private rooms (owner, account, messages, chat) stay out —
// they need a sign-in and aren't for the index.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getURL();
  const routes = [
    '',
    '/signin',
    '/verify',
    '/pricing',
    '/club',
    '/floors',
    '/floor/silver',
    '/floor/gold',
    '/floor/platinum',
    '/floor/diamond',
    '/events',
    '/crew',
    '/gifts',
    '/coat-check',
    '/swag',
    '/browse',
    '/store',
    '/terms',
    '/privacy',
    '/aup',
    '/best-practices',
    '/refunds',
    '/law-enforcement',
    '/contact',
    '/sitemap'
  ];
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: LAST_MOD
  }));
}
