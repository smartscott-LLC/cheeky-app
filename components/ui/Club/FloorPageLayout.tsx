'use client';

import Link from 'next/link';
import { ASSETS } from '@/utils/assets';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner/AnnouncementBanner';

interface FloorPageLayoutProps {
  background: string;
  floorName: string;
  floorTagline: string;
  floorSlug: string;
  eventSlug?: string;
  eventLabel?: string;
  /** Override the center button (defaults to Floor Event). */
  centerActionIcon?: string;
  centerActionHref?: string;
  /** Override the bottom-right button in the column-3 stack (defaults to Events). */
  rightBottomHref?: string;
  rightBottomLabel?: string;
  rightBottomIcon?: string;
}

/** Maps each floor slug to the character persona that represents AI Chat on that floor.
 *  Lobby → Brutus, Silver → DJ, Gold → Bartender (Roxy),
 *  Platinum → Trixie, Diamond → Hostess (Vana).
 *  Chaz is the overlay bottom-right, not in this stack. */
const FLOOR_CHARACTER: Record<string, string> = {
  lobby: ASSETS.personas.brutus,
  silver: ASSETS.personas.djStage,
  gold: ASSETS.personas.bartender,
  platinum: ASSETS.personas.trixie,
  diamond: ASSETS.personas.hostess
};

export default function FloorPageLayout({
  background,
  floorName,
  floorTagline,
  floorSlug,
  eventSlug,
  eventLabel,
  centerActionIcon,
  centerActionHref,
  rightBottomHref = '/events',
  rightBottomLabel = 'Events',
  rightBottomIcon
}: FloorPageLayoutProps) {
  const eventHref = eventSlug ? `/events/${eventSlug}` : `/events`;
  const centerHref = centerActionHref || eventHref;
  const aiChatImage = floorSlug || ASSETS.icons.star;
  const centerIcon = centerActionIcon || ASSETS.icons.neonHeartSign;
  const bottomRightIcon = rightBottomIcon || ASSETS.icons.wink;

  return (
    <div className="relative flex flex-1 flex-col inset-0 bg-black">
      {/* Background image — fills entire page */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={background}
        alt=""
        className="fixed inset-0 h-full w-full object-cover"
      />
      <div className="fixed inset-0 bg-black/55" />

      {/* Content layer — pb-32 pushes past the fixed overlay so the footer is visible */}
      <div className="relative z-6 flex flex-1 flex-col inset-0">
        {/* Top Box — 10% height, 100% width */}
        <div className="flex justify-items-start flex-col px-3 inset-0">
          {/* Ticker — centered */}
          <div className="mb-1">
            <AnnouncementBanner />
          </div>
          {/* Floor name — Damion font */}
          <p className="font-header text-cyan text-center text-2xl uppercase tracking-[0.3em]">
            The {floorName} floor
          </p>
          {/* Brief description — Rancho font */}
          <p className="font-body text-club mx-auto mt-1 max-w-xl text-xl text-center">
            {floorTagline}
          </p>
        </div>

        {/* Main Row — 3 columns, rest of height */}
        <div className="flex flex-1 flex-row">
          {/* ─── Column 1 — 1/3 width: Action Bar ─── */}
          <div className="relative hidden w-1/3 md:block">
            {/* Circular buttons stacked on far left */}
            <div className="absolute left-4 flex flex-col items-center gap-4">
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-black/60 text-gold backdrop-blur-sm transition hover:border-gold hover:bg-black/80"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
              </button>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-black/60 text-gold backdrop-blur-sm transition hover:border-gold hover:bg-black/80"
                title="Settings"
              >
                <span className="text-lg">⚙️</span>
              </button>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-black/60 text-gold backdrop-blur-sm transition hover:border-gold hover:bg-black/80"
                title="Profile"
              >
                <span className="text-lg">👤</span>
              </button>
            </div>
          </div>

          {/* ─── Column 2 — 1/3 width: Center ─── */}
          <div className="flex w-full flex-col items-center pt-4 px-4 md:w-1/3">
            {/* Club Cheeky button — oval/pill shape, at top center */}
            <Link
              href="/club"
              className="rounded-full border border-gold/60 bg-black/70 px-5 py-2 text-base font-bold text-gold backdrop-blur-sm transition hover:bg-black/90"
            >
              ✦ Club Cheeky
            </Link>

            {/* Chats + SPARX — side by side, circular, quarter-sized */}
            <div className="pt-6 flex gap-6">
              <Link
                href="/messages"
                className="group flex flex-col items-center gap-1"
              >
                <div className="flex h-15 w-40 items-center justify-center overflow-x-visible rounded-full bg-black/20 transition group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.cheekyChats}
                    alt="Chats"
                    className="h-15 w-40 object-fit"
                  />
                </div>
                <span className="font-body text-club text-lg">CHATS</span>
              </Link>
              <Link
                href="/browse"
                className="group flex flex-col items-center gap-1"
              >
                <div className="flex h-15 w-40 items-center justify-center overflow-x-visible rounded-full bg-black/20 transition group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.sparkList}
                    alt="SPARX"
                    className="h-15 w-40 object-fit"
                  />
                </div>
                <span className="font-body text-club text-lg">SPARX</span>
              </Link>
            </div>

            {/* Floor Event — circular, quarter-sized, centered */}
            <div className="pt-2">
              <Link
                href={centerHref}
                className="group flex flex-col items-center gap-1"
              >
                <div className="flex h-30 w-40 items-center justify-center overflow-x-visible rounded-full bg-black/20 transition group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.neonHeartSign}
                    alt={eventLabel}
                    className="h-30 w-40 object-fit"
                  />
                </div>
                <span className="font-body text-club text-lg">
                  {eventLabel}
                </span>
              </Link>
            </div>
          </div>

          {/* ─── Column 3 — 1/3 width: Right ─── */}
          <div className="relative hidden w-1/3 md:block">
            {/* 4 circular buttons — stick to right, hit top */}
            <div className="absolute right-4 flex flex-col items-end gap-2">
              {/* Elevators — velvet rope icon */}
              <Link
                href="/floors"
                className="group flex flex-col items-right gap-1"
              >
                <div className="flex h-14 w-14 items-right justify-center overflow-hidden rounded-full bg-black shadow-[0_0_20px_rgba(246,5,186,0.3)] transition group-hover:scale-105">
                  {' '}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.velvetRope}
                    alt="Elevators"
                    className="h-14 w-14 object-cover"
                  />
                </div>
                <span className="font-body text-center text-club text-md">
                  Elevators
                </span>
              </Link>
              {/* AI Chat — floor character portrait */}
              <Link
                href="/crew"
                className="group flex flex-col items-center gap-1"
              >
                <div className="flex h-14 w-14 items-right justify-center overflow-hidden rounded-full bg-black transition group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.star}
                    alt="AI Chat"
                    className="h-14 w-14 object-cover"
                  />
                </div>
                <span className="font-body text-center text-club text-md">
                  AI Chat
                </span>
              </Link>
              {/* Gift Store */}
              <Link
                href="/gifts"
                className="group flex flex-col items-right gap-1"
              >
                <div className="flex h-14 w-14 items-right justify-center overflow-hidden rounded-full bg-black/70 transition group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.gift}
                    alt="Gift Store"
                    className="h-14 w-14 object-contain"
                  />
                </div>
                <span className="font-body text-center text-club text-md">
                  Gift Store
                </span>
              </Link>
              {/* Right bottom button — Events (default) or Coat Check (lobby) */}
              <Link
                href={rightBottomHref}
                className="group flex flex-col items-center gap-1"
              >
                <div className="flex h-14 w-14 items-right justify-center overflow-hidden rounded-full bg-black/70 backdrop-blur-sm transition group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.icons.wink}
                    alt={rightBottomLabel}
                    className="h-14 w-14 object-contain"
                  />
                </div>
                <span className="font-body text-center text-club text-md">
                  {rightBottomLabel}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
