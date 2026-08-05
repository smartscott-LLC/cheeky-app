import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect } from 'next/navigation';

const RARITY_STYLE: Record<string, string> = {
  rare: 'text-club border-club/40',
  legendary: 'text-amber-400 border-amber-400/50'
};

export default async function CoatCheckPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }
  const floorHref = await getReturnFloor();

  // Checking in at the Coat Check = your daily streak.
  const { data: streak } = await supabase.rpc('record_checkin');

  const [
    { data: gems },
    { data: myGems },
    { data: badges },
    { data: myBadges },
    { data: stashRows },
    { data: certRows },
    { data: interestRows },
    { data: cast },
    { data: relations }
  ] = await Promise.all([
    supabase.from('gem_catalog').select('*').eq('active', true).order('rarity'),
    supabase.from('member_gems').select('gem_id, earned_at'),
    supabase.from('badge_catalog').select('*').order('created_at'),
    supabase.from('member_badges').select('badge_id, earned_at'),
    supabase
      .from('gift_inventory')
      .select('id, catalog_id, gift_catalog(name, emoji)')
      .eq('user_id', user.id)
      .eq('status', 'available'),
    supabase
      .from('certificates')
      .select('id, kind, issued_at, matches!inner(id, user_id_a, user_id_b)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false }),
    supabase
      .from('special_interests')
      .select('id, interest_user_id, created_at')
      .eq('user_id', user.id),
    supabase
      .from('characters')
      .select('id, slug, name, role, portrait_path, tagline')
      .eq('active', true)
      .order('created_at'),
    supabase.from('character_relations').select('character_id, level, points')
  ]);

  const ownedGems = new Set((myGems ?? []).map((g) => g.gem_id));
  const ownedBadges = new Set((myBadges ?? []).map((b) => b.badge_id));
  const gemDate = (id: string) =>
    (myGems ?? []).find((g) => g.gem_id === id)?.earned_at ?? null;
  const badgeDate = (id: string) =>
    (myBadges ?? []).find((b) => b.badge_id === id)?.earned_at ?? null;
  const bondLevel = (id: string) =>
    (relations ?? []).find((r) => r.character_id === id)?.level ?? 0;

  // People you've met: certificate partners + special interests.
  const certPartnerIds = (certRows ?? []).map((c) =>
    c.matches.user_id_a === user.id ? c.matches.user_id_b : c.matches.user_id_a
  );
  const partnerIds = [
    ...certPartnerIds,
    ...(interestRows ?? []).map((i) => i.interest_user_id)
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  const { data: partnerProfiles } =
    partnerIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', partnerIds)
      : { data: [] };
  const partnerName = (id: string) =>
    (partnerProfiles ?? []).find((p) => p.id === id)?.display_name ?? 'Member';

  const stash = (stashRows ?? []).map((s) => ({
    id: s.id,
    name: s.gift_catalog?.name ?? 'Gift',
    emoji: s.gift_catalog?.emoji ?? '🎁'
  }));

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🧥 The Coat Check
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-green">
          &quot;Nothing gets lost in my care.&quot; Your collection lives here —
          check in daily, the coat you hand me is your day with the club.
        </p>

        {typeof streak === 'number' && streak > 0 && (
          <p className="mt-4 text-center text-sm text-club">
            🔥 {streak} day{streak === 1 ? '' : 's'} in a row
            {streak >= 7 && streak < 30
              ? ' — keep it going, the Pearl is at 30'
              : ''}
          </p>
        )}

        {/* Gems */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">💎 Gems</h2>
          <p className="text-sm text-green">
            The vault. Limited collectibles.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(gems ?? []).map((g) => {
              const owned = ownedGems.has(g.id);
              return (
                <div
                  key={g.id}
                  className={`rounded-xl border p-5 text-center transition ${
                    owned
                      ? `bg-zinc-900/70 ${RARITY_STYLE[g.rarity] ?? 'border-club/40'}`
                      : 'border-zinc-800 bg-zinc-900/30 opacity-50 grayscale'
                  }`}
                >
                  <p className="text-4xl">{g.emoji}</p>
                  <p className="mt-2 font-bold">{g.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-green">
                    {g.rarity}
                  </p>
                  {owned ? (
                    <p className="mt-2 text-xs text-emerald-400">
                      Yours —{' '}
                      {gemDate(g.id)
                        ? new Date(gemDate(g.id) as string).toLocaleDateString()
                        : 'in the vault'}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-green">
                      {g.how_to_earn}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">🎖️ Badges</h2>
          <p className="text-sm text-green">
            What you&apos;ve earned on the floor.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(badges ?? []).map((b) => {
              const owned = ownedBadges.has(b.id);
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border p-5 text-center ${
                    owned
                      ? 'border-club/40 bg-zinc-900/70'
                      : 'border-zinc-800 bg-zinc-900/30 opacity-50 grayscale'
                  }`}
                >
                  <p className="text-4xl">{b.emoji}</p>
                  <p className="mt-2 font-bold">{b.name}</p>
                  <p className="mt-1 text-[11px] text-green">
                    {owned
                      ? badgeDate(b.id)
                        ? `Earned ${new Date(badgeDate(b.id) as string).toLocaleDateString()}`
                        : 'Earned'
                      : b.how_to_earn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* The stash */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="font-bold">🎁 The stash</h2>
            <p className="text-sm text-green">Gifts waiting to go out.</p>
            <div className="mt-3 space-y-2">
              {stash.length === 0 && (
                <p className="text-sm text-green">
                  Empty. The Gift Store is that way.
                </p>
              )}
              {stash.map((s) => (
                <p key={s.id} className="text-sm">
                  {s.emoji} {s.name}
                </p>
              ))}
            </div>
            <Link
              href="/gifts"
              className="mt-4 inline-block text-sm font-semibold text-club hover:text-club-cotton"
            >
              → Visit the Gift Store
            </Link>
          </div>

          {/* People you've met */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="font-bold">🪪 People you&apos;ve met</h2>
            <p className="text-sm text-green">
              Certificates from Speed Dating + special interests.
            </p>
            <div className="mt-3 space-y-2">
              {certPartnerIds.length === 0 && partnerIds.length === 0 && (
                <p className="text-sm text-green">
                  No certificates yet. Speed Dating is how you earn them.
                </p>
              )}
              {(certRows ?? []).map((c) => {
                const partnerId =
                  c.matches.user_id_a === user.id
                    ? c.matches.user_id_b
                    : c.matches.user_id_a;
                return (
                  <p key={c.id} className="text-sm">
                    🏅 Certificate — {partnerName(partnerId)} ·{' '}
                    {new Date(c.issued_at).toLocaleDateString()}
                  </p>
                );
              })}
              {(interestRows ?? []).map((i) => (
                <p key={i.id} className="text-sm">
                  ⭐ {partnerName(i.interest_user_id)} — special interest
                </p>
              ))}
            </div>
            <Link
              href="/events/speed"
              className="mt-4 inline-block text-sm font-semibold text-club hover:text-club-cotton"
            >
              → Speed Dating
            </Link>
          </div>
        </div>

        {/* The crew — bonds */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">🎭 The crew</h2>
          <p className="text-sm text-green">
            Characters, not real people — each with a job in the club. Get to
            know them.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(cast ?? []).map((c) => {
              const level = bondLevel(c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center"
                >
                  <div className="mx-auto h-16 w-16 overflow-hidden rounded-full border border-club/30 bg-zinc-800">
                    {c.portrait_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/${c.portrait_path}`}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xl font-bold text-green">
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold">{c.name}</p>
                  <p className="text-[11px] text-green">{c.role}</p>
                  <p className="mt-1 text-xs">
                    {level > 0 ? (
                      <span className="text-club">Bond level {level}</span>
                    ) : (
                      <span className="text-green">Not bonded yet</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-8">
          <Link
            href={floorHref}
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-green transition hover:border-zinc-500 hover:text-white"
          >
            ← Back to the floor
          </Link>
        </p>
      </div>
    </div>
  );
}
