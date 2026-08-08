// The Tiki Taskbar — one config drives the whole bar (PRD:
// docs/PRD-tiki-taskbar.md). Founder's logic: the bar carries ONLY
// hard-capped daily allowances — never token-spend items (we don't regulate
// what a member spends their tokens on; nothing rolls over, caps reset
// daily). Counts come from the taskbar_state RPC (usage) + the caps below
// (the "left" math happens in the API route).
//
// The caps mirror send_message's tier logic (30/5, 75/15, ∞/40, ∞/100) and
// the Matchmaker plays dial (2/3/4/5 — PRD-matchmaker §5). If a cap moves
// there, move it here too — the bar must agree with the enforcement.
//
// PURE module — no server imports, safe for both the API route and tests.

export interface TaskbarTileDef {
  key: string;
  icon: string;
  label: string;
  href: string;
  /** Lowest floor rank that sees this tile (silver 0, gold 1, platinum 2, diamond 3). */
  minRank: number;
  /** Feature not shipped yet — tile stays hidden until flipped. */
  shipped?: boolean;
}

export const RANK_TIERS = ['silver', 'gold', 'platinum', 'diamond'] as const;
export type TierName = (typeof RANK_TIERS)[number];

// Routes where the bar never renders: the street, the door, the office,
// auth flows. NOTE: '/' is an EXACT match — startsWith('/') matches every
// route and hides the bar everywhere (it did; that was the bug).
export const HIDDEN_PATHS = ['/signin', '/verify', '/owner', '/auth'];

export function isTaskbarHidden(pathname: string): boolean {
  return pathname === '/' || HIDDEN_PATHS.some((p) => pathname.startsWith(p));
}

export interface TierCaps {
  /** Messages per day; null = unlimited (∞ on the bar). */
  messages: number | null;
  /** New conversations per day — always capped, per the mission guardrails. */
  people: number;
  /** Matchmaker plays per day (PRD-matchmaker §5: 2/3/4/5). */
  plays: number;
}

export const TIER_CAPS: Record<TierName, TierCaps> = {
  silver: { messages: 30, people: 5, plays: 2 },
  gold: { messages: 75, people: 15, plays: 3 },
  platinum: { messages: null, people: 40, plays: 4 },
  diamond: { messages: null, people: 100, plays: 5 }
};

export const TASKBAR_TILES: Record<string, TaskbarTileDef> = {
  chats: {
    key: 'chats',
    icon: '📩',
    label: 'Cheeky Chats',
    href: '/messages',
    minRank: 0
  },
  sparks: {
    key: 'sparks',
    icon: '⚡',
    label: 'The Spark List',
    href: '/browse',
    minRank: 0
  },
  matchmaker: {
    key: 'matchmaker',
    icon: '🎯',
    label: 'Matchmaker',
    href: '/browse',
    minRank: 0,
    shipped: false // the game isn't built yet — flip when Matchmaker lands
  },
  coat: {
    key: 'coat',
    icon: '🔥',
    label: 'Coat Check',
    href: '/coat-check',
    minRank: 0
  }
};

/** Display order — the founder's four to-dos. */
export const TILE_ORDER = ['chats', 'sparks', 'matchmaker', 'coat'];

export function rankForTier(tier: string | null | undefined): number {
  const i = RANK_TIERS.indexOf((tier ?? 'silver') as TierName);
  return i === -1 ? 0 : i;
}

export function capsForTier(tier: string | null | undefined): TierCaps {
  return TIER_CAPS[RANK_TIERS[rankForTier(tier)]] ?? TIER_CAPS.silver;
}

/** The tiles a given floor rank sees, in bar order (shipped only). */
export function tilesForRank(rank: number): TaskbarTileDef[] {
  return TILE_ORDER.map((key) => TASKBAR_TILES[key])
    .filter((t): t is TaskbarTileDef => !!t)
    .filter((t) => t.shipped !== false && t.minRank <= rank);
}
