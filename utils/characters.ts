// The cast — who lives on which floor. Slugs are stable; this map is the
// source of truth for floor access (the /chat/[slug] pages gate by rank).
// Chaz is the manager: reachable from everywhere, no floor.
export const CHARACTER_FLOORS: Record<string, number> = {
  brutus: 0, // the lobby — the bouncer is at the door
  dj: 0, // the silver floor — the DJ spins the free floor
  bartender: 1, // gold — Roxy behind the bar
  trixie: 2, // platinum — Trixie works the room
  hostess: 3, // diamond — Valentina at the velvet rope
  chaz: -1 // everywhere — the club manager
};

export function characterFloorRank(slug: string): number {
  return CHARACTER_FLOORS[slug] ?? -1;
}

export function characterFloorLabel(slug: string): string {
  const rank = characterFloorRank(slug);
  return rank === 1
    ? 'Gold'
    : rank === 2
      ? 'Platinum'
      : rank === 3
        ? 'Diamond'
        : 'Silver';
}

const CHARACTER_FLOOR_NAMES: Record<string, string> = {
  brutus: 'The lobby',
  dj: 'Silver floor',
  bartender: 'Gold floor',
  trixie: 'Platinum floor',
  hostess: 'Diamond floor',
  chaz: 'Every floor'
};

export function characterFloorName(slug: string): string {
  return CHARACTER_FLOOR_NAMES[slug] ?? 'The club';
}

const FLOOR_PATHS = [
  '/floor/silver',
  '/floor/gold',
  '/floor/platinum',
  '/floor/diamond'
];

/**
 * Where an AI's exit goes: back to their own floor. Brutus is at the door
 * (the lobby); Chaz is everywhere, so his exit is decided by the caller.
 */
export function characterFloorHref(slug: string): string {
  if (slug === 'brutus') return '/club';
  const rank = CHARACTER_FLOORS[slug] ?? -1;
  return rank >= 0 && rank < FLOOR_PATHS.length ? FLOOR_PATHS[rank] : '/club';
}
