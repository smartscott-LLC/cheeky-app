import CastChat from '@/components/ui/Agent/CastChat';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import {
  characterFloorRank,
  characterFloorLabel,
  characterFloorHref
} from '@/utils/characters';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ChatPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const { data: char } = await supabase
    .from('characters')
    .select('slug, name, role, tagline, portrait_path, persona_prompt')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (!char?.persona_prompt) {
    notFound();
  }

  // Floor gate: the cast live behind their own ropes. Chaz (rank -1) is the
  // manager — reachable from anywhere. Everyone else needs their floor.
  const rank = characterFloorRank(slug);
  // The exit: back to the AI's own floor (Chaz goes to wherever the member
  // last stood; a locked floor exits to the member's last floor too).
  const floorHref =
    slug === 'chaz' ? await getReturnFloor() : characterFloorHref(slug);
  const lastFloorHref = await getReturnFloor();
  if (rank >= 0) {
    const { data: tierData } = await supabase.rpc('current_tier', {
      p_user: user.id
    });
    const tier = (tierData as string) ?? 'standard';
    const myRank =
      tier === 'gold'
        ? 1
        : tier === 'platinum'
          ? 2
          : tier === 'diamond'
            ? 3
            : 0;
    if (myRank < rank) {
      const floor = characterFloorLabel(slug);
      return (
        <div className="bg-black">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <p className="text-club text-5xl">🔒</p>
            <h1 className="font-hero text-gold mt-6 text-4xl">
              {char.name} is behind the rope.
            </h1>
            <p className="text-club mx-auto mt-3 max-w-md">
              Come see what&apos;s on this floor with a {floor} card today —
              they&apos;re worth meeting.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/#membership"
                className="rounded-lg bg-club px-8 py-3 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
              >
                See the memberships
              </Link>
              <Link
                href={lastFloorHref}
                className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-club transition hover:border-zinc-500 hover:text-white"
              >
                ← Back to the floor
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <Link
          href={floorHref}
          className="text-base font-semibold text-club hover:text-white"
        >
          ← Back to the floor
        </Link>
      </div>
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-4">
        <CastChat
          character={{
            slug: char.slug,
            name: char.name,
            role: char.role,
            tagline: char.tagline,
            portrait_path: char.portrait_path
          }}
        />
      </div>
    </div>
  );
}
