// Floating hearts for the landing hero — embers drifting up, sparse on purpose
// (a heart every second or two, sometimes a 3s gap, sometimes a tiny one in
// the background). Pure CSS (transform + opacity only), zero client JS,
// auto-pauses in background tabs, respects prefers-reduced-motion. The four
// pink shades come from tokens (club pink, cotton, bubblegum 400/500), so the
// theme stays in one place.
import type { CSSProperties } from 'react';

const PINK_SHADES = [
  'text-club-pink', // #FF4DA6 — brand neon pink
  'text-club-cotton', // #FF56D5 — lighter cotton pink
  'text-bubblegum-fizz-400', // #FF33B1 — hot pink
  'text-bubblegum-fizz-500' // #FF009D — the magenta end
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function FloatingHearts({ count = 16 }: { count?: number }) {
  const hearts = Array.from({ length: count }, (_, i) => ({
    // Round-robin so all four shades appear; geometry is randomized.
    color: PINK_SHADES[i % PINK_SHADES.length],
    x: rand(2, 98), // horizontal start, %
    size: Math.pow(Math.random(), 1.4) * 16 + 10, // 10–26px, biased small
    dur: rand(10, 18), // full float-up duration, s
    delay: -rand(0, 18), // negative → field is pre-populated on load
    drift: rand(14, 46), // sway amplitude, px
    rot: rand(-16, 16), // starting tilt, deg
    opacity: rand(0.25, 0.65) // embers are soft
  }));

  return (
    <div className="floating-hearts" aria-hidden="true">
      {hearts.map((h, i) => (
        <span
          key={i}
          className={`heart ${h.color}`}
          style={
            {
              '--x': `${h.x}%`,
              '--dur': `${h.dur}s`,
              '--delay': `${h.delay}s`,
              '--size': `${h.size}px`,
              '--drift': `${h.drift}px`,
              '--rot': `${h.rot}deg`,
              '--op': h.opacity
            } as CSSProperties
          }
        >
          ♥
        </span>
      ))}
    </div>
  );
}
