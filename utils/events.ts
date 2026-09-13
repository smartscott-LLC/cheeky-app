// The Event Center's shared config + room-state fetch, used by the hub
// (/events) and each per-event room (/events/[kind]).

import { ASSETS } from '@/utils/assets';

export interface KindMeta {
  name: string;
  floor: string;
  rank: number;
  /** Rendered as an image icon (16–20px) in cards and headers */
  icon: string;
  /** Legacy emoji — kept for places that only accept emoji strings */
  emoji: string;
  tagline: string;
  accent: string;
  image: string;
  gradient: string;
  cta: string;
}

export const KIND_META: Record<string, KindMeta> = {
  dance_floor: {
    name: 'The Dance Floor',
    floor: 'Silver',
    rank: 0,
    icon: ASSETS.icons.danceFloor,
    emoji: '🪩',
    tagline: 'Hourly. 2 minutes to pick. One song to make it count.',
    accent: 'font-body text-club border-club/40',
    image: ASSETS.brand.floorFree,
    gradient: 'from-club-indigo via-club to-club-cotton',
    cta: 'bg-club text-white hover:bg-club-cotton'
  },
  speed_dating: {
    name: 'Speed Dating',
    floor: 'Platinum',
    rank: 2,
    icon: ASSETS.icons.speedDating,
    emoji: '💘',
    tagline: 'Rotations. Ranked picks. A certificate for the ones that click.',
    accent: 'text-platinum border-platinum/40',
    image: ASSETS.brand.floorPlatinum,
    gradient: 'from-platinum-navy via-platinum to-platinum-alice',
    cta: 'bg-platinum text-platinum-navy hover:bg-platinum-alice'
  },
  rooftop: {
    name: 'The Rooftop',
    floor: 'Diamond',
    rank: 3,
    icon: ASSETS.icons.diamond,
    emoji: '🌇',
    tagline: 'The penthouse pool. Closer, higher, fewer.',
    accent: 'text-diamond border-diamond/40',
    image: ASSETS.brand.floorDiamond,
    gradient: 'from-diamond-raspberry via-diamond to-diamond-mist',
    cta: 'bg-diamond text-white hover:bg-diamond-mist hover:text-diamond-navy'
  },
  blind_date: {
    name: 'Blind Date',
    floor: 'Gold',
    rank: 1,
    icon: ASSETS.icons.neonHeart,
    emoji: '💘',
    tagline: 'One hostess. Five suitors. Four rounds. She decides.',
    accent: 'text-gold border-gold/40',
    image: ASSETS.brand.floorGold,
    gradient: 'from-gold via-gold to-gold-royal',
    cta: 'bg-gold text-black hover:bg-gold-royal'
  }
};

export const GRID_KINDS = ['dance_floor', 'rooftop'];

export const eventUrl = (kind: string) =>
  kind === 'speed_dating' ? '/events/speed' : `/events/${kind}`;

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}
