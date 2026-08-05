import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { characterFloorName } from '@/utils/characters';
import { getReturnFloor } from '@/utils/return-floor';

// The crew's home order — up the building, then the manager.
const ORDER = ['brutus', 'dj', 'bartender', 'trixie', 'hostess', 'chaz'];

export default async function CrewPage() {
  const supabase = await createClient();

  const { data: crew } = await supabase
    .from('characters')
    .select('slug, name, role, tagline, portrait_path, fullbody_path')
    .eq('active', true)
    .in('slug', ORDER);

  const sorted = (crew ?? [])
    .slice()
    .sort(
      (a, b) =>
        (ORDER.indexOf(a.slug) === -1 ? 99 : ORDER.indexOf(a.slug)) -
        (ORDER.indexOf(b.slug) === -1 ? 99 : ORDER.indexOf(b.slug))
    );

  const floorHref = await getReturnFloor();

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link
          href={floorHref}
          className="text-sm font-semibold text-green hover:text-white"
        >
          ← Back to the floor
        </Link>
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🎭 Meet the Crew
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-green">
          They&apos;re not actors — they&apos;re the people who run the club.
          Each one works their own floor. Tap their door and say hi.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {sorted.map((c) => (
            <div
              key={c.slug}
              className="flex gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              {/* Fullbody — who you see when you walk the floor */}
              <div className="h-44 w-28 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${c.fullbody_path ?? c.portrait_path}`}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-3">
                  {/* Portrait — who you talk to in the chat */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gold/50 bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${c.portrait_path}`}
                      alt={`${c.name} portrait`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold">{c.name}</p>
                    <p className="truncate text-xs uppercase tracking-wide text-green">
                      {c.role}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-green">{c.tagline}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-gold">
                  {characterFloorName(c.slug)}
                </p>

                <Link
                  href={`/chat/${c.slug}`}
                  className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg bg-club px-4 py-2 text-xs font-bold text-white transition hover:bg-club-cotton"
                >
                  Say hi →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-green">
          The crew are AI characters in-character for fun — no real people are
          working the floor. For real safety, use Report/Block in any chat.
        </p>
      </div>
    </div>
  );
}
