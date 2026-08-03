import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import FloorLayout, { FloorSpot } from '@/components/ui/Club/FloorLayout';

// The lobby — the stopping zone. Floor 1's rooms, positioned per the
// founder's entrance-scene guide: Dance Floor left (cyan), Gift Shop right
// (gold), Chats + Spark List front and center (pink), elevators upper right.
const SPOTS: FloorSpot[] = [
  {
    href: '/floor/silver',
    emoji: '🪩',
    name: 'Dance Floor',
    sub: 'The silver room',
    color: 'text-cyan border-cyan/50 hover:shadow-[0_0_24px_rgba(0,245,255,0.25)]',
    pos: 'left-[6%] top-[42%]'
  },
  {
    href: '/gifts',
    emoji: '🎁',
    name: 'Gift Shop',
    sub: 'Pour something',
    color: 'text-gold border-gold/50 hover:shadow-[0_0_24px_rgba(255,215,0,0.25)]',
    pos: 'right-[6%] top-[42%]'
  },
  {
    href: '/messages',
    emoji: '💬',
    name: 'Cheeky Chats',
    sub: 'Your conversations',
    color: 'text-club border-club/50 hover:shadow-[0_0_24px_rgba(255,45,155,0.25)]',
    pos: 'left-[36%] top-[30%]'
  },
  {
    href: '/browse',
    emoji: '⚡',
    name: 'The Spark List',
    sub: 'Who\u2019s out tonight',
    color: 'text-club border-club/50 hover:shadow-[0_0_24px_rgba(255,45,155,0.25)]',
    pos: 'right-[36%] top-[30%]'
  },
  {
    href: '/floors',
    emoji: '🛗',
    name: 'Upper floors',
    sub: 'Gold · Platinum · Diamond',
    color: 'text-gold border-gold/50 hover:shadow-[0_0_24px_rgba(255,215,0,0.25)]',
    pos: 'right-[5%] top-[8%]'
  }
];

export default async function ClubPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const profile = await getProfile(supabase, user.id);
  const verified = Boolean(profile?.verified_at);

  // The velvet rope: you don't walk the floor until Brutus clears you.
  if (!verified) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-club/50 bg-zinc-900 text-3xl">
            💪
          </div>
          <h1 className="mt-6 text-3xl font-extrabold">The velvet rope is up.</h1>
          <p className="mt-3 text-zinc-400">
            Brutus needs your ID before you walk the floor — free, quick, and
            the VIP badge comes with it.
          </p>
          <Link
            href="/verify"
            className="mt-8 inline-block rounded-lg bg-club px-10 py-4 text-lg font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
          >
            Check in at the door
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* The lobby — the base room, filled in with floor 1's rooms. */}
      <FloorLayout background="/brand/club-interior.png" spots={SPOTS} />

      {/* Where the floors lead */}
      <div className="mx-auto max-w-6xl px-6 py-10 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
          The hour spins on
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-zinc-400">
          The Dance Floor at :00, Themed Night at :15, Speed Dating at :30,
          the Rooftop at :45 — the Event Center holds the whole playlist.
        </p>
      </div>
    </div>
  );
}
