import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { launchState } from '@/utils/require-club-open';
import { betaBannerText } from '@/utils/launch-gate';

export const dynamic = 'force-dynamic';

/**
 * The Welcome booklet — the soft-open landing pad (founder greenlight).
 * Roped members land here; it explains the club the way the doorman would,
 * with the three things a pre-launch member CAN do right now: check in with
 * Brutus, hang in the lounge, peek at the building. Pure server render —
 * it's an instruction poster, not an app screen.
 */
export default async function WelcomePage({
  searchParams
}: {
  searchParams: Promise<{ roped?: string }>;
}) {
  const { roped } = await searchParams;
  const supabase = await createClient();
  const user = await getUser(supabase);
  const { open, opensAt } = await launchState();

  return (
    <div id="top" className="bg-black text-white">
      {/* The banner the founder asked for — one line, everywhere, truthful */}
      {!open && (
        <div className="border-b border-gold/30 bg-gold/10 px-4 py-3 text-center">
          <span className="font-body text-gold text-sm">
            {betaBannerText(opensAt)}
          </span>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-body tracking-[0.3em] text-club text-2xl uppercase">
          {user
            ? `Welcome back, ${user.email?.split('@')[0] ?? 'friend'}`
            : 'Welcome to the club'}
        </p>
        <h1 className="font-hero text-gold mx-auto mt-4 max-w-2xl text-5xl leading-tight sm:text-6xl">
          {open
            ? 'The doors are open.'
            : 'Doors open soon. The bar is already open.'}
        </h1>
        {roped && !open && (
          <p className="font-header mx-auto mt-4 max-w-xl text-cyan text-xl">
            You made it to the rope early — the floors wake up launch night.
            Meanwhile the lounge is tonight&apos;s whole party; pull up a stool.
          </p>
        )}
        <p className="mx-auto mt-5 max-w-xl text-xl font-body text-club">
          Club Cheeky is a nightclub for real people: everyone&apos;s a VIP with
          an ID, the free tier is genuinely free, and every floor earns its
          keep. Here&apos;s the whole building in two minutes.
        </p>

        {/* What you can do RIGHT NOW */}
        <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          <Link
            href="/verify"
            className="rounded-xl border-2 border-gold bg-gold/10 p-5 transition hover:bg-gold/20"
          >
            <p className="text-3xl">🪪</p>
            <h3 className="font-header mt-2 text-cyan text-xl">
              Get your Silver card
            </h3>
            <p className="mt-1 text-base font-body text-club">
              Two minutes with Brutus: ID, selfie, done. The card is free, and
              twenty tokens come on the house.
            </p>
          </Link>
          <Link
            href="/lounge"
            className="rounded-xl border-2 border-club bg-black p-5 transition hover:bg-club hover:text-black"
          >
            <p className="text-3xl">🍸</p>
            <h3 className="font-header mt-2 text-cyan text-xl">
              Live in the lounge
            </h3>
            <p className="mt-1 text-base font-body text-club">
              The town square is open tonight — five rooms, real people, a horn,
              and Chaz watching the door.
            </p>
          </Link>
          <Link
            href="/welcome/preview"
            className="block rounded-xl border border-zinc-700 bg-zinc-900/60 p-5 transition hover:border-gold"
          >
            <p className="text-3xl">🗺️</p>
            <h3 className="font-header mt-2 text-cyan text-xl">
              Tour the building
            </h3>
            <p className="mt-1 text-base font-body text-club">
              A peek at the floors, the dance grid and the games — the
              illustrated version, before it wakes up.
            </p>
          </Link>
        </div>

        {/* How the club works — the ladder, honestly */}
        <div className="mt-14 text-left">
          <h2 className="font-header text-center text-cyan text-3xl">
            How it works
          </h2>
          <ul className="mt-6 space-y-3 text-lg font-body text-club">
            <li>
              🟦 <span className="text-cyan">Silver</span> — the card. Free,
              verified, forever: 30 messages a day, five new faces, the lounge,
              the games.
            </li>
            <li>
              🟨 <span className="text-gold">Gold</span> · 🟪{' '}
              <span className="text-club">Platinum</span> · 💎{' '}
              <span className="text-gold">Diamond</span> — paid floors. They add
              range and visibility, never safety: matches can always reach
              matches, and messaging is never token-gated.
            </li>
            <li>
              🪙 <span className="text-gold">Tokens</span> — the house currency.
              Earn them (verification, referrals, giveaways) or buy them. They
              pay for events and gifts only — never for talking to a person.
            </li>
            <li>
              🎧 <span className="text-cyan">The Dance Floor</span> — every hour
              on the hour: three tokens, a grid of faces, two minutes per pick.
              A mutual yes is a match on the spot; a no refunds your tokens and
              nobody ever knows but you.
            </li>
          </ul>
        </div>

        {!open && (
          <p className="mt-12 text-base font-body text-zinc-400">
            The full club — floors, events, matches — wakes up{' '}
            <span className="text-gold">
              {opensAt.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            . Your card, your lounge history and your tokens all carry over —
            you&apos;re not early, you&apos;re first.
          </p>
        )}

        <div className="mt-10 flex items-center justify-center gap-6 text-base font-body">
          <Link href="/store" className="text-cyan underline hover:text-gold">
            Get tokens
          </Link>
          <Link href="/pricing" className="text-cyan underline hover:text-gold">
            See the floors
          </Link>
          <Link href="/verify" className="text-cyan underline hover:text-gold">
            Check in
          </Link>
        </div>
      </div>
    </div>
  );
}
