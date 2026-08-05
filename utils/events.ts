// The Event Center's shared config + room-state fetch, used by the hub
// (/events) and each per-event room (/events/[kind]).

export interface KindMeta {
  name: string;
  floor: string;
  rank: number;
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
    emoji: '🪩',
    tagline: 'Hourly. 2 minutes to pick. One song to make it count.',
    accent: 'text-club border-club/40',
    image: '/brand/floor-free.webp',
    gradient: 'from-club-indigo via-club to-club-cotton',
    cta: 'bg-club text-white hover:bg-club-cotton'
  },
  themed_night: {
    name: 'Themed Night',
    floor: 'Gold',
    rank: 1,
    emoji: '🎭',
    tagline: 'The floor, dressed up. A pricier ticket, a deeper crowd.',
    accent: 'text-gold border-gold/40',
    image: '/brand/floor-gold.webp',
    gradient: 'from-gold-graphite via-gold to-gold-royal',
    cta: 'bg-gold text-black hover:bg-gold-royal'
  },
  speed_dating: {
    name: 'Speed Dating',
    floor: 'Platinum',
    rank: 2,
    emoji: '💘',
    tagline: 'Rotations. Ranked picks. A certificate for the ones that click.',
    accent: 'text-platinum border-platinum/40',
    image: '/brand/floor-platinum.webp',
    gradient: 'from-platinum-navy via-platinum to-platinum-alice',
    cta: 'bg-platinum text-platinum-navy hover:bg-platinum-alice'
  },
  rooftop: {
    name: 'The Rooftop',
    floor: 'Diamond',
    rank: 3,
    emoji: '🌇',
    tagline: 'The penthouse pool. Closer, higher, fewer.',
    accent: 'text-diamond border-diamond/40',
    image: '/brand/floor-diamond.webp',
    gradient: 'from-diamond-raspberry via-diamond to-diamond-mist',
    cta: 'bg-diamond text-white hover:bg-diamond-mist hover:text-diamond-navy'
  }
};

export const GRID_KINDS = ['dance_floor', 'themed_night', 'rooftop'];

export const eventUrl = (kind: string) =>
  kind === 'speed_dating' ? '/events/speed' : `/events/${kind}`;

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}
