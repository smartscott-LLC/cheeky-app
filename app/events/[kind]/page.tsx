import EventFloor from '@/components/ui/Events/EventFloor';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getUser } from '@/utils/supabase/queries';
import { isCompatible } from '@/utils/helpers';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { KIND_META, timeLabel } from '@/utils/events';

export default async function EventRoomPage({
  params
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const meta = KIND_META[kind];
  if (!meta) {
    notFound();
  }
  if (kind === 'speed_dating') {
    // Speed dating has its own room at /events/speed.
    redirect('/events/speed');
  }

  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }
  const profile = await getProfile(supabase, user.id);
  if (!profile?.verified_at) {
    return redirect('/club');
  }
  const floorHref = await getReturnFloor();

  // Access: the room only opens for members who reach its floor.
  const { data: tierData } = await supabase.rpc('current_tier', {
    p_user: user.id
  });
  const tier = (tierData as string) ?? 'standard';
  const rank =
    tier === 'gold' ? 1 : tier === 'platinum' ? 2 : tier === 'diamond' ? 3 : 0;
  if (rank < meta.rank) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-5xl">{meta.emoji}</p>
          <h1 className="mt-6 text-3xl font-extrabold">
            {meta.name} is behind the rope.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-green">
            Come see what&apos;s on this floor with a {meta.floor} card today —
            the room&apos;s worth it.
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
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-green transition hover:border-zinc-500 hover:text-white"
            >
              The Event Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Make sure the playlist for the next couple of hours exists, then find
  // this room's next slot — join it any time, even early.
  await supabase.rpc('ensure_floor_events', { p_hours: 2 });
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('kind', kind)
    .gte('starts_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
    .order('starts_at')
    .limit(1);

  const roomEvent = events?.[0] ?? null;

  let participants: {
    userId: string;
    status: string;
    profile: {
      display_name: string | null;
      verified_at: string | null;
      photo: string | null;
    } | null;
  }[] = [];
  let myEntry: { status: string } | null = null;
  let myPicks = 0;
  let spotlightIds: string[] = [];
  let onCenterStage = false;

  if (roomEvent) {
    const [{ data: entries }, { data: picks }, { data: spotlights }] =
      await Promise.all([
        supabase
          .from('event_entries')
          .select('user_id, status')
          .eq('event_id', roomEvent.id),
        supabase
          .from('event_picks')
          .select('id')
          .eq('event_id', roomEvent.id)
          .eq('picker_id', user.id),
        supabase
          .from('center_stage')
          .select('user_id')
          .gt('center_stage_until', new Date().toISOString())
      ]);

    spotlightIds = (spotlights ?? []).map((s) => s.user_id);
    onCenterStage = spotlightIds.includes(user.id);

    const ids = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } =
      ids.length > 0
        ? await supabase
            .from('profiles')
            .select(
              'id, display_name, verified_at, gender, interested_in, photos(storage_path, is_primary)'
            )
            .in('id', ids)
            .is('bot_flagged_at', null)
            .filter('photos.held_at', 'is', 'null')
        : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          display_name: p.display_name,
          verified_at: p.verified_at,
          gender: p.gender,
          interested_in: p.interested_in,
          photo:
            p.photos?.find((ph) => ph.is_primary)?.storage_path ??
            p.photos?.[0]?.storage_path ??
            null
        }
      ])
    );

    participants =
      (entries ?? [])
        .map((e) => ({
          userId: e.user_id,
          status: e.status,
          profile: profileMap.get(e.user_id) ?? null
        }))
        .filter(
          (p) =>
            p.userId === user.id ||
            (p.profile && isCompatible(profile, p.profile)) ||
            false
        ) ?? [];
    myEntry = (entries ?? []).find((e) => e.user_id === user.id) ?? null;
    myPicks = (picks ?? []).length;
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/events"
            className="text-sm font-semibold text-green hover:text-white"
          >
            ← The Event Center
          </Link>
          <Link
            href={floorHref}
            className="text-sm font-semibold text-green hover:text-white"
          >
            ← Back to the floor
          </Link>
        </div>
      </div>

      {roomEvent ? (
        <div className="relative mx-auto mt-6 max-w-6xl overflow-hidden rounded-2xl border border-zinc-800">
          {/* The life of the floor */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meta.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative p-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold">
                {meta.emoji} {meta.name}
              </h2>
              <p className="mt-1 text-sm text-green">
                Next slot {timeLabel(roomEvent.starts_at)} · {meta.tagline}
              </p>
            </div>
            <EventFloor
              event={{
                id: roomEvent.id,
                status: roomEvent.status,
                startsAt: roomEvent.starts_at,
                tokenCost: roomEvent.token_cost,
                minFill: roomEvent.min_fill
              }}
              kind={roomEvent.kind}
              roomName={meta.name}
              participants={participants}
              myEntry={myEntry}
              myPicks={myPicks}
              myUserId={user.id}
              spotlightIds={spotlightIds}
              photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
            />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <p className="text-5xl">{meta.emoji}</p>
          <h2 className="mt-6 text-2xl font-extrabold">
            The room&apos;s between sets.
          </h2>
          <p className="mt-3 text-green">
            The next {meta.name} spins up on the hour. Check the Event Center
            for the playlist.
          </p>
          <Link
            href="/events"
            className="mt-8 inline-block rounded-lg bg-club px-8 py-3 font-bold text-white transition hover:bg-club-cotton"
          >
            The Event Center
          </Link>
        </div>
      )}
    </div>
  );
}
