'use client';

import { useEffect, useRef, useState } from 'react';
import {
  announce,
  bumpDJ,
  startDJ,
  toggleDJ,
  unlockDJ
} from '@/utils/audio/dj';

interface MatchedOverlayProps {
  onDone: () => void;
}

const ANNOUNCEMENTS = [
  'You just matched!',
  'You have one song to make this count.',
  'Get... your... groove... on!'
];

export default function MatchedOverlay({ onDone }: MatchedOverlayProps) {
  const [muted, setMuted] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    unlockDJ();
    startDJ();
    announce(ANNOUNCEMENTS, () => {
      bumpDJ();
      if (!doneRef.current) {
        doneRef.current = true;
        setTimeout(onDone, 800);
      }
    });

    // Never trap the user — safety exit.
    const safety = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, 12000);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6">
      <style>{`
        @keyframes matchedFly {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes matchedPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
      <div
        className="text-center"
        style={{ animation: 'matchedFly 0.8s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <p className="text-base font-bold uppercase tracking-[0.5em] text-club">
          The floor says
        </p>
        <h1
          className="font-hero text-gold mt-4 text-7xl tracking-tight sm:text-9xl"
          style={{ animation: 'matchedPulse 1.2s ease-in-out infinite' }}
        >
          MATCHED
        </h1>
        <p className="mt-6 text-2xl text-club sm:text-3xl">
          You have <span className="font-bold text-club">one song</span> to make
          this count.
        </p>
        <p className="mt-2 text-xl uppercase tracking-[0.3em] text-club">
          Get… your… groove… on!
        </p>
      </div>
      <div className="absolute bottom-10 flex items-center gap-4">
        <button
          onClick={() => setMuted(toggleDJ())}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-cyan hover:border-zinc-500"
        >
          {muted ? '🔇 DJ muted' : '🎧 DJ live'}
        </button>
        <button
          onClick={skip}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-cyan hover:border-club hover:text-club"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
