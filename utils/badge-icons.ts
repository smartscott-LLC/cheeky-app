import { iconUrl } from '@/utils/assets';

/**
 * badge_catalog slug → custom club badge art (icon family in cheeky-assets).
 *
 * 162 hand-made icons exist; these are the badge-shaped ones. Where no art
 * fits a badge honestly, the map says null and consumers fall back to the
 * catalog's own emoji — we never fake it with near-miss art (pearl ≠ opal).
 *
 * Founder review pass: these five assignments are judgment calls —
 * flip any line, it's the single source of truth.
 *
 * All lookups are LAZY functions — URL builders must never run at module
 * evaluation time (SSR bundles can otherwise hand this module a
 * not-yet-initialized assets namespace; see the iconUrl TypeError).
 */
const BADGE_ART: Record<string, string | null> = {
  verified: 'badge_new_arrival', // In the Club — you've just arrived
  first_match: 'badge_spark_finder', // The Connection — sparks found
  first_event: null, // 🪩 until a dance badge art exists
  streak_7: 'badge_vip_lounge', // Regular — loyalty earns the lounge
  pearl: null, // 🦪 — no pearl art; opal is NOT a stand-in
  chat_50: null, // 💬
  chat_200: null, // 🗣️
  chat_500: null, // 📢
  chat_1000: 'badge_chat_champion', // Chatterbox IV — the trophy
  chat_hour: 'badge_cocktail_bar', // The Regular 🍸 — the bar stool
  chat_horn: null // 🎺
};

export function badgeArtUrl(slug: string): string | null {
  const icon = BADGE_ART[slug];
  return icon ? iconUrl(icon) : null;
}

/** Membership tier badge art (top-left corner of the bio card). */
const TIER_ART: Record<string, string> = {
  silver: 'silver_badge',
  gold: 'gold_badge',
  platinum: 'platinum_badge',
  diamond: 'diamond_badge'
};

export function tierBadgeUrl(tier: string): string {
  return iconUrl(TIER_ART[tier] ?? TIER_ART.silver);
}
