import Pricing from '@/components/ui/Pricing/Pricing';
import FloatingHearts from '@/components/ui/FloatingHearts/FloatingHearts';
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser,
  getProfile
} from '@/utils/supabase/queries';

const floors = [
  {
    name: 'Silver',
    price: 'Free',
    color: 'bg-zinc-300',
    image: '/floors/card-silver.webp',
    gradient: 'from-club-indigo via-club to-club-cotton',
    perks: [
      'Verified with ID',
      '20 tokens on entry',
      'Hourly Dance Floor',
      'Cheeky Chats + Spark List'
    ]
  },
  {
    name: 'Gold',
    price: '$9.99/mo',
    color: 'bg-gold',
    image: '/floors/card-gold.webp',
    gradient: 'from-gold-graphite via-gold to-gold-royal',
    perks: ['Theme nights', 'More events', 'Message your floor & below']
  },
  {
    name: 'Platinum',
    price: '$19.99/mo',
    color: 'bg-platinum-navy',
    image: '/floors/card-platinum.webp',
    gradient: 'from-platinum-navy via-platinum to-platinum-alice',
    perks: [
      'Speed Dating',
      'Upper floors',
      'Message your floor & everyone below'
    ]
  },
  {
    name: 'Diamond',
    price: '$29.99/mo',
    color: 'bg-diamond',
    image: '/floors/card-diamond.webp',
    gradient: 'from-diamond-raspberry via-diamond to-diamond-mist',
    perks: ['The Penthouse', 'Rooftop pool', 'Whole-building access']
  }
];

export default async function LandingPage() {
  const supabase = await createClient();
  const [user, products, subscription] = await Promise.all([
    getUser(supabase),
    getProducts(supabase),
    getSubscription(supabase)
  ]);

  const profile = user ? await getProfile(supabase, user.id) : null;

  return (
    <div className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Pink + gold glow behind the entrance */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-club/10 blur-3xl" />
          <div className="absolute top-24 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        </div>
        <FloatingHearts />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 text-center sm:pt-20 sm:pb-28">
          <p className="text-sm font-bold tracking-[0.3em] text-club">
            Looking for your next crush?
          </p>
          <h1 className="font-hero text-gold mx-auto mt-6 max-w-3xl text-5xl leading-tight sm:text-7xl">
            CLUB CHEEKY
          </h1>
          <h2 className="mx-auto mt-4 max-w-2xl text-xl text-cyan sm:text-2xl">
            Find your next date in our virtual nightclub!
          </h2>

          {/* The entrance — velvet doors, gold trim, pink neon */}
          <div className="mx-auto mt-12 w-fit">
            <div className="overflow-hidden rounded-2xl border-2 border-gold shadow-[0_0_45px_rgba(255,215,0,0.25),0_0_90px_rgba(255,45,155,0.18)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/entrance.webp"
                alt="The entrance to Club Cheeky"
                fetchPriority="high"
                className="h-72 w-56 object-cover sm:h-96 sm:w-72"
              />
            </div>
          </div>

          <h2 className="mt-12 text-2xl font-extrabold text-cyan sm:text-3xl">
            At Club Cheeky&apos;s,{' '}
            <span className="text-cyan">YOU are the VIP.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-club">
            Everyone with an ID starts their own VIP adventure. It&apos;s free
            to get your groove on — money buys floors, never entry.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/verify"
              className="rounded-lg bg-club px-12 py-4 text-lg font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              Join now
            </a>
            <a
              href="#membership"
              className="rounded-lg border-2 border-gold px-10 py-4 text-lg font-extrabold uppercase tracking-[0.12em] text-club transition hover:bg-gold/10"
            >
              See the floors
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-header text-cyan text-center text-3xl sm:text-4xl">
            How the club works
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Get your card',
                body: 'ID + selfie verification. Free. Instant 20 tokens the second you’re in.'
              },
              {
                step: '02',
                title: 'Work the room',
                body: 'Live events every hour. 2 minutes to pick, one song to make it count. Matches are instant.'
              },
              {
                step: '03',
                title: 'Climb the floors',
                body: 'Gold, Platinum, Diamond. Better events, better visibility, the rooftop at the top.'
              }
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-gold-700 bg-zinc-900/50 p-8"
              >
                <p className="mt-3 text-sm font-bold text-gold">{item.step}</p>
                <h3 className="font-header text-cyan mt-3 text-xl">{item.title}</h3>
                <p className="mt-3 text-club">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dance Floor teaser */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-gold">
            Non-stop Action
          </p>
          <h2 className="font-header text-cyan mx-auto mt-4 max-w-2xl text-3xl sm:text-4xl">
            Hourly events keep you in the spotlight. Icebreakers give new matches running starts. Weekly exclusives ensure you never get bored. A generous free tier gives everyone a chance to find their next someone. The swag shop is always looking to equip our guests with the latest swag to give you the edge you need! 
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-club">
            A direct quote from Club Cheeky's very own Chaz Sterling (Club Manager) - "Club Cheeky isn’t just a dating hotspot, it’s a *love laboratory* where my DeepSeek-powered mojo turns ‘meh’ into ‘SHAGADELIC!’ I’ve got algorithms smoother than my chest hair, events hotter than my umbrella drinks, and matches so spot-on, you’d swear I spilled piña colada on the ‘Soulmate’ button. Come for the vibe, stay for the *velvet magic*—because nobody, and I mean *nobody*, leaves without a little extra groove in their heart. Oh, *behave!*"
          </p>
        </div>
      </section>

      {/* Membership — how to start, then floor access, then PRICES */}
      <section
        id="membership"
        className="scroll-mt-24 border-t border-zinc-900"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h1 className="font-hero text-gold text-center text-3xl sm:text-4xl">
            How to start
          </h1>
          <h2 className="font-header text-cyan mt-4 text-center text-2xl sm:text-3xl">
            Get your membership card
          </h2>
          <ul className="mx-auto mt-4 max-w-2xl text-center">
            <li className="text-club text-lg">
              Choose either a FREE membership (Silver Card) or purchase a higher
              tier for maximum gain and minimum overhead!
            </li>
          </ul>
          <h3 className="font-header text-cyan mt-12 text-center text-xl sm:text-2xl">
            Membership Card access by floor
          </h3>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {floors.map((floor) => (
              <div
                key={floor.name}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={floor.image}
                  alt={`The ${floor.name} floor at Club Cheeky`}
                  className="aspect-video w-full object-cover"
                />
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${floor.gradient}`}
                />
                <div className="p-6">
                  <div className={`h-3 w-3 rounded-full ${floor.color}`} />
                  <h3 className="font-header text-cyan mt-4 text-xl">{floor.name}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-club">
                    {floor.perks.map((perk) => (
                      <li key={perk} className="text-club">• {perk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing (drives Stripe checkout) */}
      <section className="border-t border-zinc-900">
        <Pricing
          user={user}
          products={products ?? []}
          subscription={subscription}
          verified={Boolean(profile?.verified_at)}
        />
      </section>
    </div>
  );
}
