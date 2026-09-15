// The Tiki Taskbar — the club's to-do list (PRD: docs/PRD-tiki-taskbar.md).
// Hard-capped daily allowances only. Compact tiles: icons in their natural
// colors, counts in teal Damion (∞ where unlimited), label centered above in
// gold Fascinate, tiny pink caption. Fetches live counts from /api/taskbar
// on mount, on navigation, on focus, and every 60s. Per-device prefs
// (localStorage): collapsed, hidden, and the draggable position.
//
// Layout: 2 rows — bottom row has 6 tiles, top row (left of bar) has 5 tiles
// (first slot is a cycling cursive icon, last is a refresh button).
// Default position: 4px from bottom, 16px from right edge.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isTaskbarHidden } from '../../../utils/taskbar';
import { ASSETS } from '@/utils/assets';

interface Tile {
  key: string;
  icon: string;
  label: string;
  href: string;
  count: number | null;
  unlimited?: boolean;
}
interface BarState {
  tier: string | null;
  tiles: Tile[];
}

interface Prefs {
  hidden: boolean;
  collapsed: boolean;
  /** 'topleft' | 'topright' | 'bottomleft' | 'bottomright' */
  anchor: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** offset px from the chosen corner */
  offset: { x: number; y: number };
  /** absolute pixel position on screen — computed from offset+anchor on load,
   *  written directly during drag. Always used for rendering. */
  absX: number;
  absY: number;
}

const PREFS_KEY = 'tiki:prefs';
const REFRESH_MS = 60_000;
const DEFAULT_OFFSET = { x: 16, y: 16 };

// Two-row layout constants
const BAR_W = 400;
const BAR_H = 170;
const MIN_FROM_EDGE = 6; // minimum px from any viewport edge

// Cursive icon variants — cycle through these 3 options.
const CURSIVE_ICONS = [
  ASSETS.icons.cursive1,
  ASSETS.icons.cursiveBold,
  ASSETS.icons.cursiveThin
] as const;

const DEFAULT_PREFS: Prefs = {
  hidden: false,
  collapsed: false,
  anchor: 'bottomright',
  offset: DEFAULT_OFFSET,
  // Set to NaN so loadPrefs recalculates on mount (prevents SSR/client mismatch)
  absX: NaN as unknown as number,
  absY: NaN as unknown as number
};

function clampPosition(x: number, y: number): { x: number; y: number } {
  // Use the smallest reliable viewport height:
  //   documentElement.clientHeight — actual visible content area
  //   window.innerHeight           — gross viewport (includes browser chrome)
  //   visualViewport.height        — mobile-only, changes with keyboard
  const docH = document.documentElement.clientHeight;
  const viewH = window.innerHeight;
  const vpH = window.visualViewport?.height ?? 0;
  const usedH = Math.min(docH, viewH, vpH || Infinity);
  const vw = window.innerWidth;
  const maxLeft = Math.max(MIN_FROM_EDGE, vw - BAR_W - MIN_FROM_EDGE);
  const maxTop = Math.max(MIN_FROM_EDGE, usedH - BAR_H - MIN_FROM_EDGE);
  const result = {
    x: Math.max(MIN_FROM_EDGE, Math.min(maxLeft, x)),
    y: Math.max(MIN_FROM_EDGE, Math.min(maxTop, y))
  };
  console.log(
    '[Taskbar] clamp',
    { x, y, usedH, docH, viewH, vpH, maxTop, result }
  );
  return result;
}

function getVisibleViewportHeight(): number {
  const docH = document.documentElement.clientHeight;
  const viewH = window.innerHeight;
  const vpH = window.visualViewport?.height ?? 0;
  return Math.min(docH, viewH, vpH || Infinity);
}

function isValidPosition(x: number, y: number): boolean {
  if (typeof window === 'undefined') return false;
  const vh = getVisibleViewportHeight();
  const vw = window.innerWidth;
  const maxLeft = Math.max(MIN_FROM_EDGE, vw - BAR_W - MIN_FROM_EDGE);
  const maxTop = Math.max(MIN_FROM_EDGE, vh - BAR_H - MIN_FROM_EDGE);
  return x >= MIN_FROM_EDGE && x <= maxLeft && y >= MIN_FROM_EDGE && y <= maxTop;
}

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Prefs>;
      let absX = parsed.absX;
      let absY = parsed.absY;
      if (
        absX == null ||
        absY == null ||
        !Number.isFinite(absX) ||
        !Number.isFinite(absY) ||
        !isValidPosition(absX, absY)
      ) {
        const a = parsed.anchor ?? 'bottomright';
        const o = parsed.offset ?? DEFAULT_OFFSET;
        const isTop = a.startsWith('top');
        const isLeft = a.startsWith('left');
        const vh = getVisibleViewportHeight();
        absX = isLeft ? o.x : window.innerWidth - BAR_W - o.x;
        absY = isTop ? o.y : vh - BAR_H - o.y;
      }
      const clamped = clampPosition(absX, absY);
      return {
        ...DEFAULT_PREFS,
        ...parsed,
        absX: clamped.x,
        absY: clamped.y
      };
    }
    const vh = getVisibleViewportHeight();
    const clamped = clampPosition(window.innerWidth - BAR_W - 16, vh - BAR_H - 6);
    return {
      ...DEFAULT_PREFS,
      anchor: 'bottomright',
      absX: clamped.x,
      absY: clamped.y
    };
  } catch {
    /* corrupted pref — fall back */
  }
  const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const h = getVisibleViewportHeight();
  const clamped = clampPosition(w - BAR_W - 16, h - BAR_H - 6);
  return {
    ...DEFAULT_PREFS,
    anchor: 'bottomright',
    absX: clamped.x,
    absY: clamped.y
  };
}

function formatCount(count: number | null): string {
  if (count === null || count === undefined) return '—';
  return count > 999 ? `${Math.round(count / 1000)}k` : String(count);
}

export default function TikiTaskbar() {
  const pathname = usePathname();
  const [state, setState] = useState<BarState | null>(null);
  // Don't render until we have a real window — prevents SSR position from bleeding out
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [dragging, setDragging] = useState(false);
  const [cursiveIdx, setCursiveIdx] = useState(0);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number }>({
    x: 0,
    y: 0,
    ox: 0,
    oy: 0
  });
  const barRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  // Force recalc after mount to handle SSR/client mismatch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMounted(true);
    setPrefs(loadPrefs());
  }, []);

  const fetchState = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/taskbar', { cache: 'no-store' });
      if (!res.ok) {
        console.error('[Taskbar] API error:', res.status, res.statusText);
        setState(null);
        return;
      }
      const data = await res.json();
      console.log('[Taskbar] API response:', data);
      setState(data);
    } catch (e) {
      console.error('[Taskbar] Fetch error:', e);
      // Keep the last good state — the bar must never flicker on a blip.
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Refetch on mount and every navigation (the bar lives in the layout,
  // so it doesn't re-render with the page — this is how it stays current).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch('/api/taskbar', { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) {
          setState(null);
          return;
        }
        setState((await res.json()) as BarState);
      } catch {
        // Keep the last good state — the bar must never flicker on a blip.
      } finally {
        inFlight.current = false;
      }
    };
    void run();
  }, [pathname]);

  // Light poll + refocus refresh; pause while the tab is hidden.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void fetchState();
    }, REFRESH_MS);
    const onFocus = () => fetchState();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchState]);

  // Manual refresh button — forces immediate re-fetch
  const handleRefresh = () => {
    console.log('[Taskbar] Manual refresh triggered');
    void fetchState();
  };

  // Cycle cursive icon variant
  const cycleCursive = () => {
    setCursiveIdx((i) => (i + 1) % CURSIVE_ICONS.length);
  };

  const savePrefs = (next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* private mode — prefs live for the session only */
    }
  };

  const hiddenByRoute = isTaskbarHidden(pathname);
  const nothingToShow = !state || state.tiles.length === 0;

  // Split tiles into top-row (first 5) and bottom-row (remaining).
  const topTiles = (state?.tiles ?? []).slice(0, 5);
  const bottomTiles = (state?.tiles ?? []).slice(5);

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Store absolute screen coords — independent of anchor logic.
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: rect.left,
      oy: rect.top
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const nx = dragStart.current.ox + dx;
    const ny = dragStart.current.oy + dy;
    const clamped = clampPosition(nx, ny);
    savePrefs({ ...prefs, absX: clamped.x, absY: clamped.y });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      setDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
    }
  };

  // Window resize listener to keep taskbar within view boundaries
  useEffect(() => {
    const handleResize = () => {
      setPrefs((prev) => {
        const clamped = clampPosition(prev.absX, prev.absY);
        return { ...prev, absX: clamped.x, absY: clamped.y };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted || hiddenByRoute || nothingToShow) return null;

  const { tier } = state;

  const absTop = Number.isFinite(prefs.absY) ? prefs.absY : (window.innerHeight - BAR_H - 6);
  const absLeft = Number.isFinite(prefs.absX) ? prefs.absX : (window.innerWidth - BAR_W - 16);

  return (
    <div
      ref={barRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: `${absTop}px`,
        left: `${absLeft}px`,
        touchAction: 'none',
        userSelect: 'none',
        cursor: dragging ? 'grabbing' : 'grab'
      }}
    >
      {prefs.collapsed ? (
        <button
          onClick={() => savePrefs({ ...prefs, collapsed: false })}
          className="flex items-center gap-2 rounded-full border-2 border-gold bg-zinc-950/95 px-4 py-1.5 text-gold shadow-[0_0_24px_rgba(255,215,0,0.15)] transition hover:bg-zinc-900"
          title="Expand the Tiki Taskbar"
        >
          <span className="font-hero text-sm">Tiki</span>
          <span className="text-xs">▾</span>
        </button>
      ) : (
        <div>
          {/* Label row — top of bar, controls on the right */}
          <div className="relative pr-24">
            <h2 className="font-hero text-gold text-sm tracking-wide sm:text-base">
              Tiki Taskbar
            </h2>
            <div className="absolute right-0 top-0 flex items-center gap-0.5 text-zinc-500">
              <button
                onClick={() => {
                  // Flip top↔bottom while keeping the bar visually in place.
                  const isCurrentlyTop = prefs.anchor.startsWith('top');
                  const nextAnchor: Prefs['anchor'] = isCurrentlyTop
                    ? 'bottomright'
                    : 'topright';
                  savePrefs({ ...prefs, anchor: nextAnchor });
                }}
                className="rounded px-1 py-0.5 text-[10px] transition hover:text-cyan"
                title="Toggle top/bottom"
              >
                ⇅
              </button>
              <button
                onClick={() => savePrefs({ ...prefs, collapsed: true })}
                className="rounded px-1 py-0.5 text-[10px] transition hover:text-cyan"
                title="Collapse the bar"
              >
                ▾
              </button>
              <button
                onClick={() => savePrefs({ ...prefs, hidden: true })}
                className="rounded px-1 py-0.5 text-[10px] transition hover:font-body text-club"
                title="Hide the Tiki Taskbar"
              >
                ✕
              </button>
              <button
                onClick={handleRefresh}
                className="rounded px-1 py-0.5 text-[10px] transition hover:text-cyan"
                title="Refresh taskbar data"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Two-row tile layout */}
          <div className="mt-1 flex flex-col items-stretch rounded-2xl border-2 border-gold bg-zinc-950/95 shadow-[0_0_24px_rgba(255,215,0,0.12)]">
            {/* Top row — 5 tiles (first is cursive icon, then refresh-style controls) */}
            <div className="flex items-center justify-between px-3 py-1.5">
              {/* Cursive icon — cycles through 3 variants on click */}
              <button
                onClick={cycleCursive}
                className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 transition hover:scale-105"
                title="Click to cycle cursive style"
              >
                <img
                  src={CURSIVE_ICONS[cursiveIdx]}
                  alt="cursive"
                  className="h-7 w-7 object-contain"
                />
              </button>

              {/* Top row tiles (skip first 5 if we have them, otherwise show remaining) */}
              <div className="flex flex-1 justify-center gap-x-4 gap-y-0.5">
                {topTiles.map((t) => (
                  <Link
                    key={t.key}
                    href={t.href}
                    title={t.label}
                    className="group flex flex-col items-center gap-0.5 rounded-lg px-1 py-0.5 transition hover:scale-105"
                  >
                    {t.icon.startsWith('http') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.icon}
                        alt={t.label}
                        className="h-6 w-6 object-contain"
                      />
                    ) : (
                      <span className="text-xl leading-none">{t.icon}</span>
                    )}
                    <span className="font-header text-cyan text-sm leading-none">
                      {t.unlimited ? '∞' : formatCount(t.count)}
                    </span>
                    <span className="font-body text-club text-[9px] font-semibold leading-tight tracking-wide">
                      {t.label}
                    </span>
                  </Link>
                ))}
                {/* If fewer than 5 top tiles, pad with empty space */}
                {Array.from({ length: Math.max(0, 5 - topTiles.length) }).map(
                  (_, i) => (
                    <div key={`pad-top-${i}`} className="w-12" />
                  )
                )}
              </div>

              {/* Spacer for right-side controls alignment */}
              <div className="w-20" />
            </div>

            {/* Bottom row — 6 tiles */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-2">
              {bottomTiles.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  title={t.label}
                  className="group flex flex-col items-center gap-0.5 rounded-lg px-1 py-0.5 transition hover:scale-105"
                >
                  {t.icon.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.icon}
                      alt={t.label}
                      className="h-6 w-6 object-contain"
                    />
                  ) : (
                    <span className="text-xl leading-none">{t.icon}</span>
                  )}
                  <span className="font-header text-cyan text-sm leading-none">
                    {t.unlimited ? '∞' : formatCount(t.count)}
                  </span>
                  <span className="font-body text-club text-[9px] font-semibold leading-tight tracking-wide">
                    {t.label}
                  </span>
                </Link>
              ))}
              {/* Pad bottom row if fewer than 6 tiles */}
              {Array.from({ length: Math.max(0, 6 - bottomTiles.length) }).map(
                (_, i) => (
                  <div key={`pad-bottom-${i}`} className="w-12" />
                )
              )}
            </div>
          </div>

          <p className="font-body text-club mt-1 text-center text-xs opacity-70">
            {tier === 'guest'
              ? 'Get your card to start your night'
              : 'Your daily to-dos'}
          </p>
        </div>
      )}
    </div>
  );
}
