import BrowseCard, { BrowsePerson } from '@/components/ui/Browse/BrowseCard';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, getUser } from '@/utils/supabase/queries';
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

  const { data: candidates } = await supabase
    .from('profiles')
    .select('id, display_name, bio, verified_at, photos(id, storage_path, position, is_primary)')
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
    .filter((p) => !exclude.has(p.id))
    .slice(0, 30)
    .map((p) => ({
      id: p.id,
      display_name: p.display_name,
      bio: p.bio,
      verified_at: p.verified_at,
      photos: (p.photos ?? [])
        .slice(0, photoLimit)
        .map((photo) => ({
          storage_path: photo.storage_path,
          is_primary: photo.is_primary
        }))
    }));

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          The floor
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Everyone&apos;s out tonight. Pick who you like — if they pick you
          back, it&apos;s instant. No waiting, no wondering.
        </p>
        <div className="mt-10">
          <BrowseCard people={people} photoBase={photoBase} wavedIds={wavedIds} />
        </div>
      </div>
    </div>
  );
}
