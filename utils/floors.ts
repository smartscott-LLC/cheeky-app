export interface FloorRoom {
  href: string;
  emoji: string;
  name: string;
  sub: string;
  color: string;
  pos: string;
}

export interface FloorMeta {
  slug: 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  rank: number;
  art: string;
  tagline: string;
  accent: string;
  rooms: FloorRoom[];
}

// Every floor's room scene — the floor map (docs/floor-map.md) is the
// source of truth for what belongs where:
//   LEFT   = the floor's signature event
//   MIDDLE = Event Center, Cheeky Chats, The Spark List
//   RIGHT  = Elevators + Gift Shop
// The lobby (/club) differs: LEFT = VIP area, RIGHT also carries Coat Check.

const CHAT = {
  href: '/messages',
  emoji: '💬',
  name: 'Cheeky Chats',
  sub: 'Your conversations',
  color: 'text-club border-club/50 hover:shadow-[0_0_24px_rgba(255,45,155,0.25)]',
  pos: 'left-[36%] top-[30%]'
};
const SPARK = {
  href: '/browse',
  emoji: '⚡',
  name: 'The Spark List',
  sub: 'Who\u2019s out tonight',
  color: 'text-club border-club/50 hover:shadow-[0_0_24px_rgba(255,45,155,0.25)]',
  pos: 'right-[36%] top-[30%]'
};
const GIFT = {
  href: '/gifts',
  emoji: '🎁',
  name: 'Gift Shop',
  sub: 'Buy something',
  color: 'text-gold border-gold/50 hover:shadow-[0_0_24px_rgba(255,215,0,0.25)]',
  pos: 'right-[6%] top-[42%]'
};
const ELEVATORS = {
  href: '/floors',
  emoji: '🛗',
  name: 'Elevators',
  sub: 'Up or down',
  color: 'text-gold border-gold/50 hover:shadow-[0_0_24px_rgba(255,215,0,0.25)]',
  pos: 'right-[5%] top-[8%]'
};
const CENTER = {
  href: '/events',
  emoji: '📅',
  name: 'Event Center',
  sub: 'The hourly playlist',
  color: 'text-cyan border-cyan/50 hover:shadow-[0_0_24px_rgba(0,245,255,0.25)]',
  pos: 'left-1/2 top-[58%] -translate-x-1/2'
};

export const FLOORS: FloorMeta[] = [
  {
    slug: 'silver',
    name: 'Silver',
    rank: 0,
    art: '/brand/floor-free.png',
    tagline: 'The base of the club — free, and it stays fun. The Dance Floor spins every hour.',
    accent: 'text-silver border-silver/50',
    rooms: [
      {
        href: '/events/dance_floor',
        emoji: '🪩',
        name: 'Dance Floor',
        sub: 'The hourly room',
        color: 'text-cyan border-cyan/50 hover:shadow-[0_0_24px_rgba(0,245,255,0.25)]',
        pos: 'left-[6%] top-[42%]'
      },
      GIFT,
      CHAT,
      SPARK,
      CENTER,
      ELEVATORS
    ]
  },
  {
    slug: 'gold',
    name: 'Gold',
    rank: 1,
    art: '/brand/floor-gold.png',
    tagline: 'Themed nights, deeper crowds, more to do.',
    accent: 'text-gold border-gold/50',
    rooms: [
      {
        href: '/events/themed_night',
        emoji: '🎭',
        name: 'Themed Night',
        sub: 'The Gold floor\u2019s signature',
        color: 'text-gold border-gold/50 hover:shadow-[0_0_24px_rgba(255,215,0,0.25)]',
        pos: 'left-[6%] top-[42%]'
      },
      GIFT,
      CHAT,
      SPARK,
      CENTER,
      ELEVATORS
    ]
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    rank: 2,
    art: '/brand/floor-platinum.png',
    tagline: 'Speed Dating at its finest, plus the upper rooms.',
    accent: 'text-platinum border-platinum/50',
    rooms: [
      {
        href: '/events/speed',
        emoji: '💘',
        name: 'Speed Dating',
        sub: 'The Platinum room',
        color: 'text-cyan border-cyan/50 hover:shadow-[0_0_24px_rgba(0,245,255,0.25)]',
        pos: 'left-[6%] top-[42%]'
      },
      GIFT,
      CHAT,
      SPARK,
      CENTER,
      ELEVATORS
    ]
  },
  {
    slug: 'diamond',
    name: 'Diamond',
    rank: 3,
    art: '/brand/floor-diamond.png',
    tagline: 'The penthouse. The Rooftop, the whole building.',
    accent: 'text-diamond border-diamond/50',
    rooms: [
      {
        href: '/events/rooftop',
        emoji: '🌇',
        name: 'The Rooftop',
        sub: 'Closer, higher, fewer',
        color: 'text-diamond border-diamond/50 hover:shadow-[0_0_24px_rgba(251,3,92,0.25)]',
        pos: 'left-[6%] top-[42%]'
      },
      GIFT,
      CHAT,
      SPARK,
      CENTER,
      ELEVATORS
    ]
  }
];

export const floorBySlug = (slug: string) =>
  FLOORS.find((f) => f.slug === slug);
