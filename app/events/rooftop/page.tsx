import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import RooftopPool from '@/components/ui/Events/RooftopPool';

export default async function RooftopPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // The Penthouse room — Diamond gets in (higher floors reach lower, none
  // go above; the rooftop is the top).
  const { data: tierData } = await supabase.rpc('current_tier', {
    p_user: user.id
  });
  const tier = (tierData as string) ?? 'standard';
  const rank =
    tier === 'gold' ? 1 : tier === 'platinum' ? 2 : tier === 'diamond' ? 3 : 0;
  if (rank < 3) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="font-body text-club text-5xl">🌇</p>
          <h1 className="font-hero text-gold mt-6 text-4xl">
            The Rooftop is behind the rope.
          </h1>
          <p className="font-body text-club mx-auto mt-3 max-w-md">
            Come see what&apos;s on this floor with a Diamond card today — the
            pool&apos;s worth it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/#membership"
              className="rounded-lg bg-club px-8 py-3 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              See the memberships
            </Link>
            <Link
              href="/events"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold font-body text-club transition hover:border-zinc-500 hover:text-white"
            >
              The Event Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  await supabase.rpc('ensure_floor_events', { p_hours: 2 });

  // The live pool if one is running, else the next set.
  const [{ data: running }, { data: next }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('kind', 'rooftop')
      .eq('status', 'running')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('events')
      .select('*')
      .eq('kind', 'rooftop')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(1)
      .maybeSingle()
  ]);
  const event = running ?? next;

  if (!event) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="font-hero text-gold text-4xl">🌇 The Rooftop</h1>
          <p className="font-body text-club mt-3">
            No pool scheduled right now — check back at the next :45.
          </p>
        </div>
      </div>
    );
  }

  // The board: reserved members with their profiles.
  const { data: entries } = await supabase
    .from('event_entries')
    .select('user_id, status')
    .eq('event_id', event.id);
  const reservedIds = (entries ?? [])
    .filter((e) => e.status === 'reserved')
    .map((e) => e.user_id);
  const { data: profiles } =
    reservedIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', reservedIds)
          .filter('photos.held_at', 'is', 'null')
      : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        displayName: p.display_name,
        photo:
          p.photos?.find((ph) => ph.is_primary)?.storage_path ??
          p.photos?.[0]?.storage_path ??
          null
      }
    ])
  );
  const board = reservedIds.map((id) => ({
    userId: id,
    displayName: profileMap.get(id)?.displayName ?? null,
    photo: profileMap.get(id)?.photo ?? null
  }));

  // The live round + my picks for it.
  const { data: rounds } = await supabase
    .from('rooftop_rounds')
    .select('round_index, started_at')
    .eq('event_id', event.id)
    .order('round_index', { ascending: false })
    .limit(1);
  const liveRound = (rounds ?? [])[0] ?? null;
  let myPicks: string[] = [];
  if (liveRound) {
    const { data: picks } = await supabase
      .from('rooftop_picks')
      .select('pickee_id')
      .eq('event_id', event.id)
      .eq('round_index', liveRound.round_index)
      .eq('picker_id', user.id);
    myPicks = (picks ?? []).map((p) => p.pickee_id);
  }

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link
          href="/events"
          className="text-base font-semibold font-body text-club hover:text-white"
        >
          ← The Event Center
        </Link>
        <h1 className="font-hero text-gold mt-6 text-center text-4xl sm:text-5xl">
          🌇 The Rooftop
        </h1>
        <p className="font-body text-club mx-auto mt-3 max-w-xl text-center">
          The Diamond floor&apos;s pool. Ten-second rounds, three picks each —
          mutuals leave the board, and when it&apos;s down to two, that&apos;s the
          date.
        </p>
        <div className="mt-8">
          <RooftopPool
            eventId={event.id}
            eventStatus={event.status}
            startsAt={event.starts_at}
            tokenCost={event.token_cost}
            board={board}
            round={
              liveRound
                ? {
                    round_index: liveRound.round_index,
                    started_at: liveRound.started_at
                  }
                : null
            }
            myPicks={myPicks}
            myUserId={user.id}
            photoBase={photoBase}
          />
        </div>
      </div>
    </div>
  );
}
