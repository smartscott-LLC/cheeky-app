import EventFloor from '@/components/ui/Events/EventFloor';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const KIND_META: Record<
  string,
  {
    name: string;
    floor: string;
    emoji: string;
    tagline: string;
    accent: string;
  }
> = {
  dance_floor: {
    name: 'The Dance Floor',
    floor: 'Silver',
    emoji: '🕺',
    tagline: 'Hourly. 2 minutes to pick. One song to make it count.',
    accent: 'text-club border-club/40'
  },
  themed_night: {
    name: 'Themed Night',
    floor: 'Gold',
    emoji: '🎭',
    tagline: 'The floor, dressed up. A pricier ticket, a deeper crowd.',
    accent: 'text-gold border-gold/40'
  },
  speed_dating: {
    name: 'Speed Dating',
    floor: 'Platinum',
    emoji: '💘',
    tagline: 'Rotations. Ranked picks. A certificate for the ones that click.',
    accent: 'text-platinum border-platinum/40'
  },
  rooftop: {
    name: 'The Rooftop',
    floor: 'Diamond',
    emoji: '🌇',
    tagline: 'The penthouse pool. Closer, higher, fewer.',
    accent: 'text-diamond border-diamond/40'
  }
};

const GRID_KINDS = ['dance_floor', 'themed_night', 'rooftop'];

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default async function EventsPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // Make sure the next couple of hours of the playlist exist.
  await supabase.rpc('ensure_floor_events', { p_hours: 2 });

  const [{ data: events }, { data: announcements }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .gte('starts_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .order('starts_at')
      .limit(4),
    supabase
      .from('club_announcements')
      .select('body, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const roomEvent =
    (events ?? []).find((e) => GRID_KINDS.includes(e.kind)) ?? null;
  const speedEvent = (events ?? []).find((e) => e.kind === 'speed_dating') ?? null;

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

  if (roomEvent) {
    const [{ data: entries }, { data: picks }] = await Promise.all([
      supabase
        .from('event_entries')
        .select('user_id, status')
        .eq('event_id', roomEvent.id),
      supabase
        .from('event_picks')
        .select('id')
        .eq('event_id', roomEvent.id)
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
          The Hourly Playlist
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Four floors. Four rooms. Every hour, on the quarter — a Diamond
          plays the whole set.
        </p>

        {/* The overhead ticker — anonymous, in-app only. */}
        {(announcements ?? []).length > 0 && (
          <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
            <p className="border-b border-zinc-800 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-club">
              📢 Over the house speakers
            </p>
            <ul className="divide-y divide-zinc-800">
              {(announcements ?? []).map((a, i) => (
                <li key={i} className="px-4 py-2 text-sm text-zinc-300">
                  {a.body}{" "}
                  <span className="text-xs text-zinc-600">
                    {new Date(a.created_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The Gift Store link */}
        <div className="mt-8 text-center">
          <Link
            href="/gifts"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            🍾 Pour something at the Gift Store
          </Link>
        </div>

        {/* The schedule */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(events ?? []).map((e) => {
            const meta = KIND_META[e.kind] ?? KIND_META.dance_floor;
            const isSpeed = e.kind === 'speed_dating';
            return (
              <div
                key={e.id}
                className={`rounded-xl border bg-zinc-900/50 p-5 ${
                  isSpeed ? 'border-platinum/40' : meta.accent.split(' ')[1]
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-extrabold ${meta.accent.split(' ')[0]}`}>
                    {meta.emoji}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    {timeLabel(e.starts_at)}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold">{meta.name}</h3>
                <p className="text-xs text-zinc-500">
                  {meta.floor} · {e.token_cost} tokens
                </p>
                <p className="mt-2 text-xs text-zinc-400">{meta.tagline}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                    {e.status}
                  </span>
                  {isSpeed ? (
                    <Link
                      href="/events/speed"
                      className="rounded-md bg-platinum px-3 py-1 text-xs font-bold text-platinum-navy transition hover:bg-platinum-alice"
                    >
                      Enter
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-600">On this page</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* The room — next grid event renders inline; speed dating has its own. */}
        <div className="mt-12">
          {roomEvent ? (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-extrabold">
                  {KIND_META[roomEvent.kind]?.emoji}{' '}
                  {KIND_META[roomEvent.kind]?.name ?? 'The floor'}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {KIND_META[roomEvent.kind]?.tagline}
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
                roomName={KIND_META[roomEvent.kind]?.name ?? 'The floor'}
                participants={participants}
                myEntry={myEntry}
                myPicks={myPicks}
                myUserId={user.id}
                photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
              />
            </>
          ) : speedEvent ? (
            <div className="rounded-xl border border-platinum/40 bg-platinum/5 p-8 text-center">
              <p className="text-3xl">💘</p>
              <h2 className="mt-2 text-2xl font-extrabold">Speed Dating is next</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
                Rotations every 90 seconds, ranked picks, and a certificate if
                you both click. Entry is 25 tokens (reserved — back if no
                match).
              </p>
              <Link
                href="/events/speed"
                className="mt-4 inline-block rounded-lg bg-platinum px-6 py-2.5 font-bold text-platinum-navy transition hover:bg-platinum-alice"
              >
                Enter the room
              </Link>
            </div>
          ) : (
            <p className="text-center text-zinc-500">
              The playlist is spinning up — check back in a minute.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
