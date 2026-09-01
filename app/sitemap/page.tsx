import Link from 'next/link';

const GROUPS = [
  {
    title: 'The club',
    items: [
      { href: '/', label: 'The street', note: 'The marquee — enter the club.' },
      { href: '/club', label: 'The lobby', note: 'The entrance room, rooms and all.' },
      { href: '/floors', label: 'The floors', note: 'Silver → Gold → Platinum → Diamond.' },
      { href: '/floor/silver', label: 'Silver floor', note: 'The Dance Floor and the base rooms.' },
      { href: '/floor/gold', label: 'Gold floor', note: 'Blind Date and the upper rooms.' },
      { href: '/floor/platinum', label: 'Platinum floor', note: 'Speed Dating lives here.' },
      { href: '/floor/diamond', label: 'Diamond floor', note: 'The Rooftop at the top.' }
    ]
  },
  {
    title: 'Events & the crew',
    items: [
      { href: '/events', label: 'Event Center', note: 'The hourly playlist — join any room.' },
      { href: '/crew', label: 'Meet the Crew', note: 'The six who run the place.' },
      { href: '/pricing', label: 'Memberships', note: 'The cards, the floors, no gouging.' },
      { href: '/store', label: 'The Exchange', note: 'Cards and token packs.' }
    ]
  },
  {
    title: 'The rooms',
    items: [
      { href: '/browse', label: 'SPARX', note: "Who's out tonight." },
      { href: '/messages', label: 'Cheeky Chats', note: 'Conversations, waves, Date Night.' },
      { href: '/gifts', label: 'Gift Shop', note: 'Buy gifts with tokens.' },
      { href: '/swag', label: 'Swag Shop', note: 'Redeem giveaway codes.' },
      { href: '/coat-check', label: 'Coat Check', note: 'Gems, badges, your collection.' }
    ]
  },
  {
    title: 'The door & fine print',
    items: [
      { href: '/signin', label: 'Sign in', note: 'Back in the building.' },
      { href: '/verify', label: 'Check in at the door', note: 'Verified ID → Silver card.' },
      { href: '/account', label: 'Account', note: 'Your card, your details.' },
      { href: '/terms', label: 'Terms of Use', note: 'The rules of the club.' },
      { href: '/privacy', label: 'Privacy Policy', note: 'How your data is handled.' },
      { href: '/aup', label: 'Acceptable Use', note: 'The floor rules.' },
      { href: '/best-practices', label: 'Best Practices', note: 'Staying safe, having fun.' },
      { href: '/refunds', label: 'Refund Policy', note: 'Tokens, holds, no-match rules.' },
      { href: '/law-enforcement', label: 'Law Enforcement', note: 'Valid process, preservation.' },
      { href: '/contact', label: 'Contact', note: 'The desks — info, helpdesk, safety.' }
    ]
  }
];

export default function SitemapPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-hero text-gold text-center text-3xl sm:text-4xl">
          🗺️ The Map of the Club
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-club">
          Every room in the building, one list. If you can walk it, it&apos;s
          here.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="font-header text-cyan mb-3 border-b border-zinc-800 pb-2 text-sm uppercase tracking-widest">
                {group.title}
              </h2>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.href} className="text-club">
                    <Link
                      href={item.href}
                      className="group block rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-gold/50 hover:bg-zinc-900"
                    >
                      <span className="block font-semibold text-white group-hover:text-gold">
                        {item.label}
                      </span>
                      <span className="block text-sm text-cyan">
                        {item.note}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
