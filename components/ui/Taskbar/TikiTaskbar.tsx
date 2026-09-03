// The Tiki Taskbar — the club's to-do list (PRD: docs/PRD-tiki-taskbar.md).
// Hard-capped daily allowances only. Tucked bottom-left at 1/3 width (out of
// the way of everything you scroll), compact tiles: icons in their natural
// colors, counts in teal Damion (∞ where unlimited), label centered above in
// gold Fascinate, tiny pink caption. Fetches live counts from /api/taskbar
// on mount, on navigation, on focus, and every 60s. Per-device prefs
// (localStorage): collapse, move top/bottom, hide.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isTaskbarHidden } from '@/utils/taskbar';

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

type Position = 'top' | 'bottom';
interface Prefs {
  hidden: boolean;
  collapsed: boolean;
  position: Position;
}

const PREFS_KEY = 'tiki:prefs';
const REFRESH_MS = 60_000;

const DEFAULT_PREFS: Prefs = { hidden: false, collapsed: false, position: 'bottom' };

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* corrupted pref — fall back */
  }
  return DEFAULT_PREFS;
}

function formatCount(count: number | null): string {
  if (count === null) return '·';
  return count > 999 ? `${Math.round(count / 1000)}k` : String(count);
}

export default function TikiTaskbar() {
  const pathname = usePathname();
  const [state, setState] = useState<BarState | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
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
    fetchState();
  }, [fetchState, pathname]);

  // Light poll + refocus refresh; pause while the tab is hidden.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchState();
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

  if (hiddenByRoute || nothingToShow) return null;

  const { tiles, tier } = state;

  return (
    <div
      className={`${
        prefs.position === 'top'
          ? 'sticky top-[4rem] z-40 w-1/3 min-w-[240px] md:top-[5rem]'
          : 'fixed bottom-3 left-3 z-40 w-1/3 min-w-[240px]'
      }`}
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
            <h2 className="font-hero text-gold text-center text-sm tracking-wide sm:text-base">
              Tiki Taskbar
            </h2>
            <div className="absolute right-0 top-0 flex items-center gap-1 text-zinc-500">
              <button
                onClick={() =>
                  savePrefs({
                    ...prefs,
                    position: prefs.position === 'top' ? 'bottom' : 'top'
                  })
                }
                className="rounded px-1 py-0.5 text-[10px] transition hover:text-cyan"
                title={prefs.position === 'top' ? 'Move to the bottom' : 'Move to the top'}
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

          <p className="font-body text-club mt-1 text-center font-body text-xs opacity-70">
            {tier === 'guest'
              ? 'Get your card to start your night'
              : 'Your daily to-dos'}
          </p>
        </div>
      )}
    </div>
  );
}
