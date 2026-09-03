'use client';

import { ReactNode, useState } from 'react';
import L3Trio from './L3Trio';
import Matchmaker from './Matchmaker';

type Mode = 'spark' | 'l3' | 'matchmaker';

/**
 * The spark lab — /browse is the hub of ways to create sparks. Mode 1 is the
 * classic 1-for-1 Swipes; Mode 2 is L³ (Leave · Like · Love); Mode 3 is
 * Matchmaker (the memory-game board that unlocks first impressions). Each
 * mode carries a one-line how-it-works; rewards sit behind "more details".
 */
export default function SparkLab({ spark }: { spark: ReactNode }) {
  const [mode, setMode] = useState<Mode>('spark');
  const [details, setDetails] = useState(false);

  const tab = (key: Mode, label: string) => (
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

  const description =
    mode === 'spark' ? (
      <p className="mx-auto mt-4 max-w-xl text-center text-base font-body text-club">
        One face at a time. Say yes or skip — a mutual yes is an instant spark.
      </p>
    ) : mode === 'l3' ? (
      <p className="mx-auto mt-4 max-w-xl text-center text-base font-body text-club">
        Three faces at once. Rank them — Leave, Like, Love — then the next trio. Mutual Love is
        a super match.
      </p>
    ) : (
      <p className="mx-auto mt-4 max-w-xl text-center text-base font-body text-club">
        16 cards, 8 faces. Match a pair — unlock a first impression to that person, even if they
        never liked you back.
      </p>
    );

  const detailsBlock =
    mode === 'l3' ? (
      <div className="mx-auto mt-3 max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm font-body text-club">
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
    ) : mode === 'matchmaker' ? (
      <div className="mx-auto mt-3 max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm font-body text-club">
        <p>
          <span className="font-bold text-gold">2 matches win</span>, 3 strikes lose. Matching a
          pair earns one first impression — it never touches your message limits.
        </p>
        <p className="mt-2">
          Accepting opens the chat. A decline stays silent — but you still won the game:{' '}
          <span className="font-bold text-gold">a Matchmaker-exclusive gift</span>, one per
          floor, never for sale, lands in your inventory.
        </p>
        <p className="mt-2">
          Plays per day by floor: <span className="font-bold">2 / 3 / 4 / 5</span>. No tokens —
          the intro is earned by play.
        </p>
      </div>
    ) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {tab('spark', '⚡ Swipes')}
        {tab('l3', 'L³')}
        {tab('matchmaker', '🎯 Matchmaker')}
      </div>

      {description}
      {mode !== 'spark' && (
        <button
          onClick={() => setDetails((d) => !d)}
          className="mx-auto mt-2 block text-sm font-semibold text-cyan underline-offset-2 hover:underline"
        >
          {details ? 'Hide details' : 'More details'}
        </button>
      )}
      {details && detailsBlock}

      <div className="mt-8">
        {mode === 'spark' ? spark : mode === 'l3' ? <L3Trio /> : <Matchmaker />}
      </div>
    </div>
  );
}
