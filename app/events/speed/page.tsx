import SpeedDatingFloor from '@/components/ui/Events/SpeedDatingFloor';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SpeedDatingPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // The Platinum room — only members who reach the Platinum floor get in.
  const { data: tierData } = await supabase.rpc('current_tier', {
    p_user: user.id
  });
  const tier = (tierData as string) ?? 'standard';
  const rank =
    tier === 'gold' ? 1 : tier === 'platinum' ? 2 : tier === 'diamond' ? 3 : 0;
  if (rank < 2) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-5xl">💘</p>
          <h1 className="mt-6 text-3xl font-extrabold">
            Speed Dating is behind the rope.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            Come see what&apos;s on this floor with a Platinum card today —
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
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              The Event Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  await supabase.rpc('ensure_floor_events', { p_hours: 2 });

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('kind', 'speed_dating')
    .gte('starts_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .order('starts_at')
    .limit(1);

  const event = events?.[0] ?? null;

  let participants: {
    userId: string;
    status: string;
    groupNumber: number | null;
    profile: {
      display_name: string | null;
      verified_at: string | null;
      photo: string | null;
    } | null;
  }[] = [];
  let myEntry: { status: string; groupNumber: number | null } | null = null;
  let sessions: { slot_index: number; user_a: string; user_b: string }[] = [];

  if (event) {
    const { data: entries } = await supabase
      .from('event_entries')
      .select('user_id, status, group_number')
      .eq('event_id', event.id);

    const ids = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } =
      ids.length > 0
        ? await supabase
            .from('profiles')
            .select('id, display_name, verified_at, photos(storage_path, is_primary)')
            .in('id', ids)
            .filter('photos.held_at', 'is', 'null')
        : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          display_name: p.display_name,
          verified_at: p.verified_at,
          photo:
            p.photos?.find((ph) => ph.is_primary)?.storage_path ??
            p.photos?.[0]?.storage_path ??
            null
        }
      ])
    );

    participants =
      (entries ?? []).map((e) => ({
        userId: e.user_id,
        status: e.status,
        groupNumber: e.group_number,
        profile: profileMap.get(e.user_id) ?? null
      })) ?? [];

    const rawEntry = (entries ?? []).find((e) => e.user_id === user.id) ?? null;
    myEntry = rawEntry
      ? { status: rawEntry.status, groupNumber: rawEntry.group_number }
      : null;

    if (myEntry?.groupNumber != null) {
      const { data: sessionRows } = await supabase
        .from('speed_sessions')
        .select('slot_index, user_a, user_b')
        .eq('event_id', event.id)
        .eq('group_number', myEntry.groupNumber)
        .order('slot_index');
      sessions = sessionRows ?? [];
    }
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          Speed Dating
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Platinum floor. Groups of six. Ninety seconds with each person, then
          pick who you&apos;d like to meet again.
        </p>
        <div className="mt-10">
          {event ? (
            <SpeedDatingFloor
              event={{
                id: event.id,
                status: event.status,
                startsAt: event.starts_at,
                tokenCost: event.token_cost,
                minFill: event.min_fill
              }}
              participants={participants}
              myEntry={myEntry}
              sessions={sessions}
              myUserId={user.id}
              photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
            />
          ) : (
            <p className="text-center text-zinc-500">
              No Speed Dating slots scheduled — check back later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
