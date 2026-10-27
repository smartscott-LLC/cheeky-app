import Link from 'next/link';

/**
 * The building, illustrated (soft-open companion page). Deliberately STATIC —
 * a poster of the club, not the club. When launch flips, the real thing is
 * one tap away; this page exists so beta members arrive already knowing
 * where the bar is.
 */
const FACES = [
  '💁‍♀️',
  '🧕🏽',
  '💃🏻',
  '🕺🏼',
  '🧑‍🎤',
  '👩‍💻',
  '🧔🏾',
  '👱🏻‍♀️',
  '🥷🏽',
  '👩‍🦰',
  '🧑🏽‍🎨',
  '👸🏻',
  '🤵🏻',
  '👰🏾',
  '🧙🏻',
  '🦸🏾'
];

export default function PreviewPage() {
  return (
    <div className="bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-body tracking-[0.3em] text-club text-xl uppercase">
          The illustrated tour
        </p>
        <h1 className="font-hero text-gold mt-2 text-4xl sm:text-5xl">
          Inside the building
        </h1>
        <p className="mt-3 text-xl font-body text-club">
          Everything below is a sketch of what&apos;s coming — the real thing
          opens on launch night. This is the map, so the club feels familiar the
          second the doors do.
        </p>

        {/* The lobby mock */}
        <section className="mt-12">
          <h2 className="font-header text-cyan text-2xl">🏠 The Lobby</h2>
          <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6">
            <div className="grid grid-cols-3 gap-4 text-center sm:grid-cols-6">
              {[
                ['🎟️', 'Exchange'],
                ['🎁', 'Gifts'],
                ['💬', 'Chats'],
                ['🔥', 'Spark'],
                ['🛗', 'Floors'],
                ['🧥', 'Coat']
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-black/60 py-4"
                >
                  <span className="text-3xl">{icon}</span>
                  <span className="font-body text-base text-club">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-base font-body text-zinc-400">
              Brutus nods from the door. The HUD floats bottom-right — your
              card, tokens and daily counts, always one tap away.
            </p>
          </div>
        </section>

        {/* The dance floor mock */}
        <section className="mt-10">
          <h2 className="font-header text-cyan text-2xl">
            🎧 The Dance Floor · every hour on the hour
          </h2>
          <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6">
            <div className="mx-auto grid max-w-md grid-cols-4 gap-3">
              {FACES.map((f, i) => (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-4xl ${
                    i === 5
                      ? 'border-gold bg-gold/20'
                      : i === 10
                        ? 'border-club bg-club/20'
                        : 'border-zinc-800 bg-black/50'
                  }`}
                >
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="font-header text-gold text-xl">
                💛 like &nbsp;·&nbsp; ✋ skip &nbsp;·&nbsp; 2:00 per face
              </p>
              <p className="text-center text-base font-body text-club">
                Three tokens in. Two minutes to decide each person you&apos;re
                beside. Both tap like? You&apos;re matching right there — that
                is the whole trick. Pass, or they pass: your tokens come back,
                silently, and nobody is ever turned down in public.
              </p>
            </div>
          </div>
        </section>

        {/* The ladder mock */}
        <section className="mt-10">
          <h2 className="font-header text-cyan text-2xl">
            🛗 The ladder — five floors, one roof
          </h2>
          <div className="mt-4 flex flex-col items-center gap-1 text-center">
            {[
              ['💎', 'Diamond — the Rooftop', 'text-gold'],
              ['🟪', 'Platinum — Speed Dating', 'text-club'],
              ['🟨', 'Gold — Blind Date, hosted', 'text-gold'],
              ['🟦', 'Silver — your card (free!)', 'text-cyan'],
              ['🚶', 'Guest — the street', 'text-zinc-400']
            ].map(([icon, label, cls]) => (
              <div
                key={label}
                className={`w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 font-body text-lg ${cls}`}
              >
                {icon} {label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-base font-body text-zinc-400">
            Higher floors widen the spotlight — they never hold the door against
            you. The free tier stays free forever; that&apos;s the whole deal.
          </p>
        </section>

        <div className="mt-14 text-center">
          <p className="font-header text-cyan text-2xl">
            Coming after launch: your own character — a little you, dancing on
            the card, dressed for the occasion.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-lg font-body">
            <Link
              href="/verify"
              className="text-gold underline hover:text-club"
            >
              Check in with Brutus →
            </Link>
            <Link
              href="/lounge"
              className="text-club underline hover:text-gold"
            >
              The lounge is open now →
            </Link>
          </div>
          <p className="mt-6 text-base font-body text-zinc-500">
            <Link href="/welcome" className="underline hover:text-cyan">
              ← back to the welcome booklet
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
