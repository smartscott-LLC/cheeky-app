import Pricing from '@/components/ui/Pricing/Pricing';
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';

const floors = [
  {
    name: 'Silver',
    price: 'Free',
    color: 'bg-zinc-300',
    perks: ['Verified with ID', '20 tokens on entry', 'Hourly Dance Floor']
  },
  {
    name: 'Gold',
    price: '$9.99/mo',
    color: 'bg-gold',
    perks: ['Themed nights', 'More events', 'Message down to Silver']
  },
  {
    name: 'Platinum',
    price: '$19.99/mo',
    color: 'bg-platinum-navy',
    perks: ['Speed Dating', 'Upper floors', 'Message everyone below']
  },
  {
    name: 'Diamond',
    price: '$29.99/mo',
    color: 'bg-diamond',
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

  return (
    <div className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
            A dating app built like a nightclub
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight sm:text-7xl">
            Everyone&apos;s a VIP
            <br />
            <span className="text-club">with an ID.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300 sm:text-xl">
            Get your free Silver card. Work the room. Catch the Dance Floor —
            every hour, on the hour. No $20-a-week nonsense. Ever.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/signin/signup"
              className="rounded-lg bg-club px-8 py-4 text-lg font-semibold text-white transition hover:bg-club-cotton"
            >
              Get your card
            </a>
            <a
              href="#membership"
              className="rounded-lg border border-zinc-700 px-8 py-4 text-lg font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              See the floors
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">
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
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8"
              >
                <p className="text-sm font-bold text-club">{item.step}</p>
                <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-zinc-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dance Floor teaser */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
            The Dance Floor
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold sm:text-4xl">
            Every hour on the hour. 3 tokens. One song to make it count.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
            Everyone&apos;s photo hits the grid. Pick the ones you like. When
            two people pick each other — instant match, center floor, announced.
            No match? Your tokens come back. Quietly.
          </p>
        </div>
      </section>

      {/* Floors */}
      <section id="membership" className="scroll-mt-24 border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">
            The floors
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-zinc-400">
            The only price of admission is being a real person. Money buys
            floors, not entry.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {floors.map((floor) => (
              <div
                key={floor.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className={`h-3 w-3 rounded-full ${floor.color}`} />
                <h3 className="mt-4 text-xl font-bold">{floor.name}</h3>
                <p className="mt-1 text-sm font-semibold text-club">
                  {floor.price}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                  {floor.perks.map((perk) => (
                    <li key={perk}>• {perk}</li>
                  ))}
                </ul>
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
        />
      </section>
    </div>
  );
}
