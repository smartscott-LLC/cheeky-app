import EventFloor from '@/components/ui/Events/EventFloor';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';

export default async function EventsPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // Make sure the next couple of hourly slots exist, then grab the current one.
  await supabase.rpc('ensure_events', { p_hours: 2 });

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
    .order('starts_at')
    .limit(2);

  const event = events?.[0] ?? null;

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

  if (event) {
    const [{ data: entries }, { data: picks }] = await Promise.all([
      supabase
        .from('event_entries')
        .select('user_id, status')
        .eq('event_id', event.id),
      supabase
        .from('event_picks')
        .select('id')
        .eq('event_id', event.id)
        .eq('picker_id', user.id)
    ]);

    const ids = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } =
      ids.length > 0
        ? await supabase
            .from('profiles')
            .select('id, display_name, verified_at, photos(storage_path, is_primary)')
            .in('id', ids)
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
        profile: profileMap.get(e.user_id) ?? null
      })) ?? [];
    myEntry = (entries ?? []).find((e) => e.user_id === user.id) ?? null;
    myPicks = (picks ?? []).length;
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          The Dance Floor
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Every hour on the hour. 3 tokens. 2 minutes to pick. One song to make
          it count.
        </p>
        <div className="mt-10">
          {event ? (
            <EventFloor
              event={{
                id: event.id,
                status: event.status,
                startsAt: event.starts_at,
                tokenCost: event.token_cost,
                minFill: event.min_fill
              }}
              participants={participants}
              myEntry={myEntry}
              myPicks={myPicks}
              myUserId={user.id}
              photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
            />
          ) : (
            <p className="text-center text-zinc-500">
              No events scheduled right now — check back on the hour.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
