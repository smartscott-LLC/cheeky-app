'use client';

import { ReactNode, useState } from 'react';
import L3Trio from './L3Trio';

/**
 * The spark lab — /browse is the hub of ways to create sparks. Mode 1 is the
 * classic 1-for-1 Swipes; Mode 2 is L³ (Leave · Like · Love). Each mode
 * carries a one-line how-it-works; the L³ rewards live behind "more details".
 */
export default function SparkLab({ spark }: { spark: ReactNode }) {
  const [mode, setMode] = useState<'spark' | 'l3'>('spark');
  const [details, setDetails] = useState(false);

  const tab = (key: 'spark' | 'l3', label: string) => (
    <button
      onClick={() => setMode(key)}
      className={`rounded-lg px-5 py-2 text-base font-bold transition ${
        mode === key
          ? 'bg-gold text-black'
          : 'border border-gold/50 text-gold hover:border-gold hover:bg-gold/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        {tab('spark', '⚡ Swipes')}
        {tab('l3', 'L³')}
      </div>

      {mode === 'spark' ? (
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-club">
          One face at a time. Say yes or skip — a mutual yes is an instant spark.
        </p>
      ) : (
        <>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-club">
            Three faces at once. Rank them — Leave, Like, Love — then the next trio. Mutual Love is
            a super match.
          </p>
          <button
            onClick={() => setDetails((d) => !d)}
            className="mx-auto mt-2 block text-sm font-semibold text-cyan underline-offset-2 hover:underline"
          >
            {details ? 'Hide details' : 'More details'}
          </button>
          {details && (
            <div className="mx-auto mt-3 max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-club">
              <p>
                <span className="font-bold text-cyan">Like + Like</span> or{' '}
                <span className="font-bold text-cyan">Like + Love</span> — a match with{' '}
                <span className="font-bold">5 free messages each</span>.
              </p>
              <p className="mt-2">
                <span className="font-bold text-gold">Love + Love</span> — the super match:{' '}
                <span className="font-bold">5 free messages each + a gift</span> from the club.
              </p>
              <p className="mt-2">
                Anyone in a trio can be from any floor — and a mutual Love crosses floors. Leave
                is silent, always.
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-8">{mode === 'spark' ? spark : <L3Trio />}</div>
    </div>
  );
}
