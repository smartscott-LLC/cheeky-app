import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import FloorPageLayout from '@/components/ui/Club/FloorPageLayout';
import { ASSETS } from '@/utils/assets';

export default async function ClubPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const profile = await getProfile(supabase, user.id);
  const verified = Boolean(profile?.verified_at);

  // The velvet rope: you don't walk the floor until Brutus clears you.
  if (!verified) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-club/50 bg-zinc-900 text-3xl">
            💪
          </div>
          <h1 className="font-hero text-gold mt-6 text-4xl">
            The velvet rope is up.
          </h1>
          <p className="font-body text-club mt-3 text-lg">
            Brutus needs your ID before you walk the floor — free, quick, and
            the VIP badge comes with it.
          </p>
          <Link
            href="/verify"
            className="mt-8 inline-block rounded-lg bg-club px-10 py-4 text-lg font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
          >
            Check in at the door
          </Link>
        </div>
      </div>
    );
  }

  return (
    <FloorPageLayout
      background={ASSETS.brand.clubInterior}
      floorName="Lobby"
      floorTagline="The Dance Floor at :00, Speed Dating at :30, the Rooftop at :45 — and Blind Date when the Gold floor's hostess opens the door."
      floorSlug="lobby"
      eventSlug="dance_floor"
      eventLabel="VIP"
      centerActionIcon={ASSETS.icons.vipLounge}
      centerActionHref="/floor/silver"
      rightBottomHref="/coat-check"
      rightBottomLabel="Coat Check"
      rightBottomIcon={ASSETS.icons.coatCheck}
    />
  );
}