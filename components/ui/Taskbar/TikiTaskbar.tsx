// The Tiki Taskbar — the club's to-do list (PRD: docs/PRD-tiki-taskbar.md).
// Hard-capped daily allowances only. Compact tiles: icons in their natural
// colors, counts in teal Damion (∞ where unlimited), label centered above in
// gold Fascinate, tiny pink caption. Fetches live counts from /api/taskbar
// on mount, on navigation, on focus, and every 60s. Per-device prefs
// (localStorage): collapsed, hidden, and the draggable position.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isTaskbarHidden } from '../../../utils/taskbar';

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
const DEFAULT_OFFSET = { x: 0, y: 0 };
const BAR_W = 280;
const BAR_H = 90;

const DEFAULT_PREFS: Prefs = {
  hidden: false,
  collapsed: false,
  anchor: 'topright',
  offset: DEFAULT_OFFSET,
  absX: 0,
  absY: 12
};

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Fill in absX/absY from offset+anchor if missing (backwards compat).
      if (parsed.absX == null || parsed.absY == null) {
        const a = parsed.anchor ?? 'bottomleft';
        const o = parsed.offset ?? DEFAULT_OFFSET;
        const isTop = a.startsWith('top');
        const isLeft = a.startsWith('left');
        parsed.absX = isLeft ? o.x : window.innerWidth - BAR_W - o.x;
        parsed.absY = isTop ? o.y : window.innerHeight - BAR_H - o.y;
      }
      return { ...DEFAULT_PREFS, ...parsed };
    }
    // First-time default: top-right, 16px from edges
    return {
      ...DEFAULT_PREFS,
      absX: window.innerWidth - BAR_W - 16,
      absY: 16
    };
  } catch {
    /* corrupted pref — fall back */
  }
  return {
    ...DEFAULT_PREFS,
    absX: window.innerWidth - BAR_W - 16,
    absY: 16
  };
}

function formatCount(count: number | null): string {
  if (count === null) return '·';
  return count > 999 ? `${Math.round(count / 1000)}k` : String(count);
}

export default function TikiTaskbar() {
  const pathname = usePathname();
  const [state, setState] = useState<BarState | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number }>({
    x: 0,
    y: 0,
    ox: 0,
    oy: 0
  });
  const barRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const fetchState = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/taskbar', { cache: 'no-store' });
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
    const nx = Math.max(
      0,
      Math.min(window.innerWidth - BAR_W, dragStart.current.ox + dx)
    );
    const ny = Math.max(
      0,
      Math.min(window.innerHeight - BAR_H, dragStart.current.oy + dy)
    );
    // Store absolute pixels directly — no anchor math needed.
    savePrefs({ ...prefs, absX: nx, absY: ny });
  };

  const onPointerUp = () => {
    setDragging(false);
  };

  if (hiddenByRoute || nothingToShow) return null;

  const { tiles, tier } = state;

  // Render using stored absolute pixel position directly.
  const absTop = prefs.absY;
  const absLeft = prefs.absX;

  return (
    <div
      ref={barRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: 'fixed',
        zIndex: 40,
        top: absTop,
        left: absLeft,
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
          {/* Label — centered over the bar, small. Controls hug the corner. */}
          <div className="relative pr-20">
            <h2 className="font-hero text-gold text-sm tracking-wide sm:text-base">
              Tiki Taskbar
            </h2>
            <div className="absolute left-0 top-0 flex items-center gap-1 text-zinc-500">
              <button
                onClick={() => {
                  // Flip top↔bottom while keeping the bar visually in place.
                  // Only change the anchor label — absY stays the same pixel value.
                  const isCurrentlyTop = prefs.anchor.startsWith('top');
                  const nextAnchor: Prefs['anchor'] = isCurrentlyTop
                    ? 'bottomleft'
                    : 'topleft';
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
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-2xl border-2 border-gold bg-zinc-950/95 px-4 py-2 shadow-[0_0_24px_rgba(255,215,0,0.12)]">
            {tiles.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                title={t.label}
                className="group flex flex-col items-center gap-0.5 rounded-lg px-1 py-0.5 transition hover:scale-105"
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="font-header text-cyan text-sm leading-none">
                  {t.unlimited ? '∞' : formatCount(t.count)}
                </span>
                <span className="font-body text-club text-[9px] font-semibold leading-tight tracking-wide">
                  {t.label}
                </span>
              </Link>
            ))}
          </div>

          <p className="text-club mt-1 text-center font-body text-xs opacity-70">
            {tier === 'guest'
              ? 'Get your card to start your night'
              : 'Your daily to-dos'}
          </p>
        </div>
      )}
    </div>
  );
}
