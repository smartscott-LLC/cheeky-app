'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ASSETS } from '@/utils/assets';

/**
 * The grand entrance — 8 seconds of velvet-rope magic (entrance_v2.mp4,
 * served from cheeky-assets). Plays ONCE per browser session when a member
 * arrives at the lobby via ?enter=1 (the Square "Enter Club Cheeky" button
 * and the landing entry). Audio-first: browsers that demand a gesture get
 * the muted roll + a "tap for the music" pill. Skip is always available —
 * we never hold anyone hostage to our own party favors.
 */
export default function EntranceOverlay() {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Once per session: if already played this session, the replace() drops
    // ?enter=1, the server re-renders, and the overlay simply never mounts.
    if (sessionStorage.getItem('entrance-played') === '1') {
      router.replace('/club');
      return;
    }
    sessionStorage.setItem('entrance-played', '1');
  }, [router]);

  const finish = () => {
    setFading(true);
    setTimeout(() => {
      setGone(true);
      router.replace('/club');
    }, 450);
  };

  const startAudio = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => undefined);
    setMuted(false);
  };

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="The club entrance"
    >
      <div className="relative w-[min(92vw,880px)]">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={ASSETS.video.entrance}
          className="w-full rounded-xl border border-gold/40 shadow-[0_0_90px_rgba(255,216,0,0.25)]"
          autoPlay
          playsInline
          onPlay={() => {
            const v = videoRef.current;
            if (v && v.muted) setMuted(true); // autoplay was forced muted
          }}
          onEnded={finish}
          onError={finish}
        />
        {muted && (
          <button
            type="button"
            onClick={startAudio}
            className="font-header text-gold absolute top-3 left-3 rounded-full border border-gold/60 bg-zinc-950/90 px-4 py-2 text-sm shadow-lg transition hover:bg-gold/10"
          >
            🔊 Tap for the music
          </button>
        )}
        <button
          type="button"
          onClick={finish}
          className="font-body text-zinc-300 absolute right-3 -bottom-10 text-sm underline-offset-4 transition hover:text-gold hover:underline"
        >
          Skip the grand entrance →
        </button>
      </div>
    </div>
  );
}
