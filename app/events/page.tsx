import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { KIND_META, eventUrl, timeLabel } from '@/utils/events';

export default async function EventsPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // Make sure the next couple of hours of the playlist exist.
  await supabase.rpc('ensure_floor_events', { p_hours: 2 });
  const floorHref = await getReturnFloor();

  // Your floor decides which rooms are lit. Silver=0, Gold=1, Platinum=2,
  // Diamond=3 — every room at or below your floor is open to you.
  const { data: tierData } = await supabase.rpc('current_tier', {
    p_user: user.id
  });
  const tier = (tierData as string) ?? 'standard';
  const rank =
    tier === 'gold' ? 1 : tier === 'platinum' ? 2 : tier === 'diamond' ? 3 : 0;

  const kinds = Object.keys(KIND_META);
  const [{ data: events }, { data: announcements }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .in('kind', kinds)
      .gte('starts_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .order('starts_at')
      .limit(8),
    supabase
      .from('club_announcements')
      .select('body, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  // The playlist spins one of each every hour — the first slot per room is
  // its next (or current) set.
  const nextByKind = new Map<string, NonNullable<typeof events>[number]>();
  for (const e of events ?? []) {
    if (!nextByKind.has(e.kind)) nextByKind.set(e.kind, e);
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link
          href={floorHref}
          className="text-sm font-semibold text-zinc-500 hover:text-white"
        >
          ← Back to the floor
        </Link>
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          The Event Center
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          The hourly playlist. Four floors. Four rooms — every hour, on the
          quarter. Join any room any time; your spot is held for the next set.
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
                  {a.body}{' '}
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

        {/* The four rooms — lit up to your floor, behind the rope past it. */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kinds.map((kind) => {
            const meta = KIND_META[kind];
            const locked = rank < meta.rank;
            const next = nextByKind.get(kind) ?? null;
            return (
              <div
                key={kind}
                className={`relative overflow-hidden rounded-2xl border bg-zinc-900/50 ${
                  locked ? 'border-zinc-800' : 'border-zinc-700'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meta.image}
                  alt={meta.name}
                  className="h-28 w-full object-cover"
                />
                <div
                  className={`h-1 w-full bg-gradient-to-r ${meta.gradient}`}
                />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold">
                      {meta.emoji} {meta.name}
                    </h3>
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${
                        meta.accent.split(' ')[0]
                      }`}
                    >
                      {meta.floor}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {next
                      ? `${timeLabel(next.starts_at)} · ${next.token_cost} tokens`
                      : 'Between sets'}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">{meta.tagline}</p>
                  {locked ? (
                    <p className="mt-4 text-sm font-bold text-gold">
                      Behind the rope. Come see what&apos;s on these floors with
                      a {meta.floor} card today.
                    </p>
                  ) : (
                    <Link
                      href={eventUrl(kind)}
                      className={`mt-4 inline-block w-full rounded-lg px-4 py-2 text-center text-sm font-bold transition ${meta.cta}`}
                    >
                      {next ? 'Enter the room →' : 'The room'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* The Gift Shop link */}
        <div className="mt-8 text-center">
          <Link
            href="/gifts"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            🎁 Buy something for someone at the Gift Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
