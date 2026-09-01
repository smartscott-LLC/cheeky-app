import BrowseCard, { BrowsePerson } from '@/components/ui/Browse/BrowseCard';
import SparkLab from '@/components/ui/Browse/SparkLab';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getSubscription, getUser } from '@/utils/supabase/queries';
import { isCompatible } from '@/utils/helpers';
import { getReturnFloor } from '@/utils/return-floor';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function BrowsePage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // Who to hide: yourself, people you already liked, people you matched.
  const exclude = new Set<string>([user.id]);

  const { data: liked } = await supabase
    .from('likes')
    .select('likee_id')
    .eq('liker_id', user.id);
  liked?.forEach((l) => exclude.add(l.likee_id));

  const { data: matches } = await supabase
    .from('matches')
    .select('user_id_a, user_id_b')
    .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`);
  matches?.forEach((m) => {
    exclude.add(m.user_id_a);
    exclude.add(m.user_id_b);
  });

  // Identity + preference drive the Spark List: only mutually compatible
  // people show up (each must be in the other's dating preference).
  const myProfile = await getProfile(supabase, user.id);

  const { data: candidates } = await supabase
    .from('profiles')
    .select(
      'id, display_name, bio, one_liner, verified_at, gender, interested_in, photos(id, storage_path, position, is_primary)'
    )
    .is('bot_flagged_at', null)
    .filter('photos.held_at', 'is', 'null')
    .limit(50);

  const { data: myWaves } = await supabase
    .from('waves')
    .select('recipient_id')
    .eq('sender_id', user.id);
  const wavedIds = (myWaves ?? []).map((w) => w.recipient_id);

  // Viewer tier photo limit: 3 for Silver and below, more for paid floors.
  const subscription = await getSubscription(supabase);
  const tierName = subscription?.prices?.products?.name ?? null;
  const photoLimit =
    tierName === 'Gold Membership'
      ? 6
      : tierName === 'Platinum Membership'
        ? 8
        : tierName === 'Diamond Club'
          ? 10
          : 3;

  const people: BrowsePerson[] = (candidates ?? [])
    .filter((p) => !exclude.has(p.id) && isCompatible(myProfile, p))
    .slice(0, 30)
    .map((p) => ({
      id: p.id,
      display_name: p.display_name,
      bio: p.bio,
      one_liner: p.one_liner,
      verified_at: p.verified_at,
      photos: (p.photos ?? []).slice(0, photoLimit).map((photo) => ({
        storage_path: photo.storage_path,
        is_primary: photo.is_primary
      }))
    }));

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;
  const floorHref = await getReturnFloor();

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link
          href={floorHref}
          className="text-base font-semibold text-club hover:text-white"
        >
          ← Back to the floor
        </Link>
        <h1 className="text-center text-4xl font-hero text-gold sm:text-5xl">
          SPARX
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-club">
          Everyone&apos;s out tonight. Pick who you like — if they pick you
          back, it&apos;s instant. No waiting, no wondering.
        </p>
        <div className="mt-10">
          <SparkLab
            spark={
              <BrowseCard
                people={people}
                photoBase={photoBase}
                wavedIds={wavedIds}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
