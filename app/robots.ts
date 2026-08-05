import type { MetadataRoute } from 'next';

import { getURL } from '@/utils/helpers';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Members-only rooms and the owner's booth are not for the index.
      disallow: ['/owner', '/account', '/messages', '/chat', '/api']
    },
    sitemap: `${getURL()}/sitemap.xml`
  };
}
