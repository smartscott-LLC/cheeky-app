import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { floorBySlug } from '@/utils/floors';
import FloorLayout from '@/components/ui/Club/FloorLayout';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner/AnnouncementBanner';

export default async function FloorPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const floor = floorBySlug(slug);
  if (!floor) {
    notFound();
  }

  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const { data: tierData } = await supabase.rpc('current_tier', {
    p_user: user.id
  });
  const tier = (tierData as string) ?? 'standard';
  const rank =
    tier === 'gold' ? 1 : tier === 'platinum' ? 2 : tier === 'diamond' ? 3 : 0;
  const locked = floor.rank > rank;

  // Under construction? The Den closes a floor and the elevators say so.
  const { data: closure } = await supabase
    .from('floor_closures')
    .select('reason, until')
    .eq('floor', slug)
    .maybeSingle();
  const closed =
    closure && (!closure.until || new Date(closure.until) > new Date());

  if (closed) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="font-body text-club text-5xl">🚧</p>
          <h1 className="font-hero text-gold mt-6 text-4xl">
            The {floor.name} floor is under construction
          </h1>
          <p className="font-body text-club mx-auto mt-3 max-w-md text-lg">
            {closure?.reason ??
              'The crew is setting up the room — come back soon.'}
          </p>
          <div className="mt-8">
            <Link
              href="/floors"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold font-body text-club transition hover:border-zinc-500 hover:text-white"
            >
              ← Back to the elevators
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <Link
          href="/floors"
          className="text-base font-semibold font-body text-club hover:text-white"
        >
          ← The floors
        </Link>
      </div>

      {locked ? (
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="font-body text-club text-5xl">🛗</p>
          <h1 className="font-hero text-gold mt-6 text-4xl">
            The {floor.name} floor is behind the rope.
          </h1>
          <p className="font-body text-club mx-auto mt-3 max-w-md text-lg">
            Come see what&apos;s on these floors with a {floor.name} card today
            — the view&apos;s worth it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/#membership"
              className="rounded-lg bg-club px-8 py-3 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              See the memberships
            </Link>
            <Link
              href="/club"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold font-body text-club transition hover:border-zinc-500 hover:text-white"
            >
              Back to the lobby
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-6xl px-6 pt-6 text-center">
            {/* The floor kicker follows the type system — Damion, cyan —
                on every floor (founder: the diamond one rendered in its
                raspberry accent; headers are always cyan). */}
            <p className="font-header text-cyan text-base uppercase tracking-[0.3em]">
              The {floor.name} floor
            </p>
            <p className="font-body text-club mx-auto mt-2 max-w-xl text-lg">
              {floor.tagline}
            </p>
            <div className="mt-5">
              <AnnouncementBanner />
            </div>
          </div>
          <div className="pt-6">
            <FloorLayout background={floor.art} spots={floor.rooms} />
          </div>
        </>
      )}
    </div>
  );
}
