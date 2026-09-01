'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker — the PWA hook that makes the site
 * installable and powers the Android Trusted Web Activity wrapper.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }
  }, []);
  return null;
}
