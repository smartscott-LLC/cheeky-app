'use client';

import { useEffect, useRef, useState } from 'react';
import { ASSETS } from '@/utils/assets';

/**
 * The "take the app with you" nudge — the PWA install path, done right:
 *  - Android/Chrome fires `beforeinstallprompt`; we catch it and offer the
 *    real install flow.
 *  - iOS has no such event — installed PWAs only, so we show the Share →
 *    Add to Home Screen steps instead.
 *  - Never shows inside the standalone app (already installed), and once
 *    dismissed it stays quiet for a week.
 */
export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const deferred = useRef<{ prompt: () => void } | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem('cc-install-prompt') === 'dismissed') return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as unknown as { prompt: () => void };
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS can't fire beforeinstallprompt — show the instructions after a beat.
    if (isIos) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onPrompt);
      };
    }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('cc-install-prompt', 'dismissed');
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes cc-toast-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div
          className="w-full max-w-md rounded-xl border border-gold/40 bg-zinc-900/95 p-4 shadow-[0_0_32px_rgba(255,215,0,0.15)]"
          style={{ animation: 'cc-toast-up 0.28s ease-out' }}
        >
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.brand.entranceLogo}
            alt=""
            className="h-10 w-10 rounded-lg"
          />
          <div className="flex-1">
            <p className="font-body text-club text-sm font-extrabold">
              Take the club with you.
            </p>
            {ios ? (
              <p className="mt-1 text-xs font-body text-club">
                Tap <span className="font-bold">Share</span> →{' '}
                <span className="font-bold">Add to Home Screen</span> and the
                club lives on your home screen like an app.
              </p>
            ) : (
              <p className="mt-1 text-xs font-body text-club">
                Install Club Cheeky — it runs full-screen, works offline, and
                loads straight from the floor.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-zinc-500 transition hover:text-white"
          >
            ✕
          </button>
        </div>
        {!ios && (
          <button
            onClick={async () => {
              const p = deferred.current;
              if (p) {
                await p.prompt();
                dismiss();
              }
            }}
            className="mt-3 w-full rounded-lg bg-gold px-4 py-2 text-sm font-extrabold text-black transition hover:bg-gold-royal"
          >
            Install the app →
          </button>
        )}
        </div>
      </div>
    </>
  );
}
