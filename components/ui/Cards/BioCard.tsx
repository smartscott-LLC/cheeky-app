'use client';

import { useState } from 'react';
import Image from 'next/image';
import { assetUrl } from '@/utils/assets';
import { TIER_BADGE_ART, badgeArtUrl } from '@/utils/badge-icons';

/**
 * The Bio Card — Club Cheeky's baseball-card identity surface
 * (docs/PRD-avatar-maker.md visual doctrine).
 *
 * Depth is the whole point: the 3D-avatar slot and the two badges FLOAT
 * above the card frame — borders and photo pass beneath them. Section
 * labels are Fascinate/gold, small item labels Damion/cyan, body text
 * Rancho/pink. Non-negotiable.
 *
 * Click to flip: the back is the member's collectible card back
 * (heart art for ladies, gold/silver for men — mapping confirmed by
 * founder; swap the two slugs below if it's reversed).
 */

export interface BioCardPerson {
  displayName: string;
  oneLiner: string | null;
  bio: string | null;
  photoUrl: string | null;
  gender: string | null;
  tier: string;
  verified: boolean;
  age?: number | null;
  height?: string | null;
  location?: string | null;
  displayBadge?: { slug: string; name: string; emoji: string } | null;
  avatar?: { snapshotUrl: string | null; modelUrl: string | null } | null;
}

const CARD_BACK = (gender: string | null) =>
  gender === 'female'
    ? assetUrl('icons', 'collectible_card_back1.webp')
    : assetUrl('icons', 'collectible_card_back2.webp');

export default function BioCard({ person }: { person: BioCardPerson }) {
  const [flipped, setFlipped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasAvatar = Boolean(person.avatar?.snapshotUrl);
  const stats = [
    person.age ? `Age: ${person.age}` : null,
    person.height ? `Height: ${person.height}` : null,
    person.location ? `Location: ${person.location}` : null
  ].filter(Boolean) as string[];

  return (
    <div
      className="w-full max-w-xs select-none"
      style={{ perspective: '1200px' }}
    >
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show card face' : 'Show card back'}
        className="relative block w-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* ── FACE ── */}
        <div
          className="relative aspect-[5/7] w-full rounded-2xl border-4 border-gold/50 bg-zinc-900/95 p-3 text-left"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* photo, inside the frame */}
          <div className="relative h-[52%] overflow-hidden rounded-xl border-2 border-gold/30 bg-zinc-800">
            {person.photoUrl ? (
              <Image
                src={person.photoUrl}
                alt={person.displayName}
                fill
                sizes="320px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl">
                🪪
              </div>
            )}
          </div>

          {/* text column — pads against the avatar slot when present */}
          <div className={hasAvatar ? 'pr-[42%] pt-3' : 'pt-3'}>
            <p className="font-hero text-gold text-base leading-tight">
              Intro Line
            </p>
            <p className="font-body text-club mt-0.5 text-sm leading-snug">
              {person.oneLiner || 'Let&apos;s make some mischief! ✨'}
            </p>

            <p className="font-hero text-gold mt-3 text-base leading-tight">
              Bio in Short
            </p>
            <p
              className={`font-body text-white/90 mt-0.5 text-sm leading-snug ${
                expanded ? '' : 'line-clamp-3'
              }`}
            >
              {person.bio || 'No bio yet — say hi and ask them yourself.'}
            </p>
            {person.bio && person.bio.length > 90 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((x) => !x);
                }}
                className="font-header text-gold text-sm hover:underline"
              >
                {expanded ? '…less' : 'Read More…'}
              </button>
            )}

            {stats.length > 0 && (
              <p className="font-header text-cyan mt-3 text-xs">
                {stats.join(' | ')}
              </p>
            )}
          </div>

          {/* avatar slot — floats above the frame, bottom-right, ~half height */}
          {hasAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatar?.snapshotUrl ?? ''}
              alt={`${person.displayName}'s avatar`}
              className="pointer-events-none absolute right-1 bottom-1 z-20 h-1/2 w-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            />
          )}

          {/* membership badge — top-left, floating above photo + border */}
          <span
            className="absolute -top-2 -left-2 z-30 drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]"
            title={`${person.tier}${person.verified ? ' · verified' : ''}`}
          >
            <Image
              src={TIER_BADGE_ART[person.tier] ?? TIER_BADGE_ART.silver}
              alt={`${person.tier} card`}
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              unoptimized
            />
          </span>

          {/* earned badge — top-right, same float; custom art, emoji fallback */}
          {person.displayBadge &&
            (badgeArtUrl(person.displayBadge.slug) ? (
              <span
                className="absolute -top-2 -right-2 z-30 drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]"
                title={person.displayBadge.name}
              >
                <Image
                  src={badgeArtUrl(person.displayBadge.slug) ?? ''}
                  alt={person.displayBadge.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                  unoptimized
                />
              </span>
            ) : (
              <span className="font-header text-club absolute -top-1 -right-1 z-30 rounded-full border border-club/60 bg-zinc-950 px-2.5 py-1 text-xs shadow-[0_6px_18px_rgba(0,0,0,0.7)]">
                {person.displayBadge.emoji} {person.displayBadge.name}
              </span>
            ))}
        </div>

        {/* ── BACK ─ */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-gold/50"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CARD_BACK(person.gender)}
            alt={`${person.displayName}'s card back`}
            className="h-full w-full object-cover"
          />
          <p className="font-hero text-gold absolute inset-x-0 bottom-3 text-center text-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {person.displayName}
          </p>
        </div>
      </button>
    </div>
  );
}
