import Link from 'next/link';
import type { ReactNode } from 'react';

export interface FloorSpot {
  href: string;
  emoji: string;
  name: string;
  sub: string;
  color: string;
  pos: string;
  /** The cast spots carry the character's image instead of an emoji. */
  image?: string;
  imageAlt?: string;
}

interface FloorLayoutProps {
  /** The floor's life — its art as the backdrop. */
  background: string;
  /** The rooms, positioned around the scene. */
  spots: FloorSpot[];
  medallionHref?: string;
  medallionLabel?: string;
  /** Extra life inside the room (Trixie, banners, characters). */
  children?: ReactNode;
}

/**
 * The base room — every floor fills in the blanks. The club is a room,
 * not a menu: a floor's art is the backdrop and its rooms are positioned
 * around it. Each floor page supplies its own background + spots and gets
 * the same bones (desktop room scene + mobile coat-rack fallback).
 */
export default function FloorLayout({
  background,
  spots,
  medallionHref = '/club',
  medallionLabel = '✦ Club Cheeky',
  children
}: FloorLayoutProps) {
  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={background}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      {/* Desktop: the room, positioned like a room */}
      <div className="absolute inset-0 hidden md:block">
        {spots.map((spot) => (
          <Link
            key={spot.name}
            href={spot.href}
            className={`absolute ${spot.pos} group rounded-xl border bg-black/70 px-5 py-4 backdrop-blur-sm transition hover:bg-black/85 ${spot.color}`}
          >
            <p className="text-2xl">
              {spot.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spot.image}
                  alt={spot.imageAlt ?? spot.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                spot.emoji
              )}
            </p>
            <p className="mt-1 text-sm font-extrabold uppercase tracking-[0.12em] group-hover:text-white">
              {spot.name}
            </p>
            <p className="text-xs text-zinc-400">{spot.sub}</p>
          </Link>
        ))}
        <Link
          href={medallionHref}
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2 rounded-full border border-gold/60 bg-black/70 px-5 py-2 text-sm font-bold text-gold backdrop-blur-sm transition hover:bg-black/90"
        >
          {medallionLabel}
        </Link>
        {children}
      </div>

      {/* Mobile: same rooms, stacked like a coat rack */}
      <div className="absolute inset-0 overflow-y-auto p-4 md:hidden">
        <div className="grid grid-cols-2 gap-3 pt-4">
          {spots.map((spot) => (
            <Link
              key={spot.name}
              href={spot.href}
              className={`rounded-xl border bg-black/80 p-4 backdrop-blur-sm ${spot.color}`}
            >
              <p className="text-2xl">
                {spot.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={spot.image}
                    alt={spot.imageAlt ?? spot.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ) : (
                  spot.emoji
                )}
              </p>
              <p className="mt-1 text-sm font-extrabold uppercase tracking-[0.12em]">
                {spot.name}
              </p>
              <p className="text-xs text-zinc-400">{spot.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
