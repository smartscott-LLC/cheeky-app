'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

/**
 * Boots PostHog analytics. The project key (phc_...) is public by design and
 * comes from the PostHog setup wizard — no auth token involved. When the key
 * isn't set (e.g. local dev), init is skipped and the capture() calls around
 * the app no-op safely.
 *
 * The app was instrumented long ago (checkout, likes, waves, events,
 * messages, gifts, Date Night); this is the missing init that makes those
 * events actually send.
 */
export default function PostHogProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true
    });
  }, []);
  return null;
}
