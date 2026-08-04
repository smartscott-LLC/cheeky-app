import GiftShop from '@/components/ui/Gifts/GiftShop';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import {
  getUser,
  getProfile,
  getTokenBalance
} from '@/utils/supabase/queries';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect } from 'next/navigation';

export default async function GiftsPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const [profile, tokenBalance, tierData] = await Promise.all([
    getProfile(supabase, user.id),
    getTokenBalance(supabase),
    supabase.rpc('current_tier', { p_user: user.id })
  ]);

  const tier = (tierData?.data as string) ?? 'standard';
  const tierLabel =
    tier === 'gold'
      ? 'Gold'
      : tier === 'platinum'
        ? 'Platinum'
        : tier === 'diamond'
          ? 'Diamond'
          : 'Silver';

  const [{ data: catalog }, { data: stashRows }, { data: incomingRows }, { data: sentRows }] =
    await Promise.all([
      supabase
        .from('gift_catalog')
        .select('id, slug, name, emoji, floor, token_cost, kind')
        .eq('active', true)
        .order('token_cost'),
      supabase
        .from('gift_inventory')
        .select('id, catalog_id, status')
        .eq('user_id', user.id)
        .eq('status', 'available'),
      supabase
        .from('gift_sends')
        .select(
          'id, status, sender_id, catalog_id, gift_catalog!inner(name, emoji)'
        )
        .eq('recipient_id', user.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false }),
      supabase
        .from('gift_sends')
        .select(
          'id, status, recipient_id, catalog_id, gift_catalog!inner(name, emoji)'
        )
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false })
    ]);

  // Who can I send to? Your matches + your conversations.
  const floorHref = await getReturnFloor();
  const [{ data: matches }, { data: convos }] = await Promise.all([
    supabase
      .from('matches')
      .select('user_id_a, user_id_b')
      .eq('status', 'active')
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`),
    supabase
      .from('conversations')
      .select('user_id_a, user_id_b')
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)
  ]);

  const otherIds = [
    ...(matches ?? []).map((m) =>
      m.user_id_a === user.id ? m.user_id_b : m.user_id_a
    ),
    ...(convos ?? []).map((c) =>
      c.user_id_a === user.id ? c.user_id_b : c.user_id_a
    )
  ].filter((id, i, arr) => id !== user.id && arr.indexOf(id) === i);

  const { data: peopleProfiles } =
    otherIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', otherIds)
          .filter('photos.held_at', 'is', 'null')
      : { data: [] };

  const people = (peopleProfiles ?? []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    photo:
      p.photos?.find((ph) => ph.is_primary)?.storage_path ??
      p.photos?.[0]?.storage_path ??
      null
  }));

  // Sender profiles for incoming gifts (recipient sees everything — photo too).
  const senderIds = [
    ...(incomingRows ?? []).map((s) => s.sender_id),
    ...(sentRows ?? []).map((s) => s.recipient_id)
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  const { data: senderProfiles } =
    senderIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', senderIds)
          .filter('photos.held_at', 'is', 'null')
      : { data: [] };

  const profileMap = new Map(
    (senderProfiles ?? []).map((p) => [
      p.id,
      {
        display_name: p.display_name,
        photo:
          p.photos?.find((ph) => ph.is_primary)?.storage_path ??
          p.photos?.[0]?.storage_path ??
          null
      }
    ])
  );

  const stash = (stashRows ?? []).map((s) => {
    const item = (catalog ?? []).find((c) => c.id === s.catalog_id);
    return {
      id: s.id,
      name: item?.name ?? 'Gift',
      emoji: item?.emoji ?? '🎁',
      floor: item?.floor ?? 'silver'
    };
  });

  const incoming = (incomingRows ?? []).map((s) => {
    const sender = profileMap.get(s.sender_id) ?? {
      display_name: null,
      photo: null
    };
    return {
      id: s.id,
      name: s.gift_catalog?.name ?? 'Gift',
      emoji: s.gift_catalog?.emoji ?? '🎁',
      sender: { id: s.sender_id, ...sender }
    };
  });

  const sent = (sentRows ?? []).map((s) => {
    const recipient = profileMap.get(s.recipient_id);
    return {
      id: s.id,
      name: s.gift_catalog?.name ?? 'Gift',
      emoji: s.gift_catalog?.emoji ?? '🎁',
      status: s.status,
      recipientName: recipient?.display_name ?? 'Member'
    };
  });

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
          🎁 The Gift Shop
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Buy something for someone. The club hears the cork pop — but only
          they know it was you.
        </p>
        <div className="mt-10">
          <GiftShop
            tokenBalance={tokenBalance ?? 0}
            tierLabel={tierLabel}
            catalog={(catalog ?? []).map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              emoji: c.emoji,
              floor: c.floor,
              token_cost: c.token_cost,
              kind: c.kind
            }))}
            stash={stash}
            incoming={incoming}
            sent={sent}
            people={people}
            photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
          />
        </div>
      </div>
    </div>
  );
}
