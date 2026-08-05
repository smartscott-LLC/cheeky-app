import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import { FLOORS } from '@/utils/floors';

export default async function FloorsPage() {
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

  // Floors the Den has put under construction — show it on the card.
  const { data: closureRows } = await supabase
    .from('floor_closures')
    .select('floor, until');
  const closedFloors = new Set(
    (closureRows ?? [])
      .filter((c) => !c.until || new Date(c.until) > new Date())
      .map((c) => c.floor)
  );

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🛗 The floors
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-green">
          Every floor is its own room. Pick where you want to go — the elevators
          take you there.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {FLOORS.map((floor) => {
            const locked = floor.rank > rank;
            return (
              <Link
                key={floor.slug}
                href={`/floor/${floor.slug}`}
                className={`group relative overflow-hidden rounded-2xl border transition ${
                  locked
                    ? 'border-zinc-800'
                    : 'border-zinc-700 hover:border-gold'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={floor.art}
                  alt={`The ${floor.name} floor`}
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-2xl font-extrabold">
                    {floor.name} floor
                    <span className="ml-2 text-sm font-semibold text-green">
                      {floor.rank === 1
                        ? '· $9.99/mo'
                        : floor.rank === 2
                          ? '· $19.99/mo'
                          : floor.rank === 3
                            ? '· $29.99/mo'
                            : '· free'}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-green">{floor.tagline}</p>
                  {locked ? (
                    <p className="mt-2 text-sm font-bold text-gold">
                      Come see what&apos;s on these floors with a {floor.name}{' '}
                      card today.
                    </p>
                  ) : closedFloors.has(floor.slug) ? (
                    <p className="mt-2 text-sm font-bold text-club">
                      🚧 Under construction
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-bold text-club opacity-0 transition group-hover:opacity-100">
                      Step in →
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
