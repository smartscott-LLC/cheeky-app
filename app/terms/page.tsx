import Link from 'next/link';
import { CONTACT } from '@/utils/contact';

const SECTIONS = [
  {
    num: '1',
    title: 'Getting in',
    items: [
      'You must be 18 or older. The club checks. No exceptions.',
      'One account per person. One identity per account. Fake profiles are a bouncing offense.',
      'Entry requires passing the Door Check for events and the full club; Guests may look around the street level without one.'
    ]
  },
  {
    num: '2',
    title: 'Membership',
    items: [
      'Silver card is free: verified members get the card, the VIP badge, 20 tokens, and event access.',
      'Gold, Platinum, and Diamond are paid floors billed monthly through Stripe. Subscriptions auto-renew until canceled.',
      'You can cancel anytime, in one click, from your Account page. No phone calls, no retention scripts, no surprise charges.'
    ]
  },
  {
    num: '3',
    title: 'Events & the Dance Floor',
    items: [
      'Events cost tokens per floor (3 / 5 / 25 / 40). Entry is non-refundable once the event runs — but see §6 for the no-match rule.',
      'During events: be excellent. The floor rules (§5) apply inside every song.',
      'Either dancer can end a song early. Both can report from inside the chat.'
    ]
  },
  {
    num: '4',
    title: 'Tokens',
    items: [
      'Tokens are in-app currency for events and gifts. They are not redeemable for cash, not transferable between users, and not an investment.',
      'Earn: verification, referrals, giveaways. Buy: token packs via Stripe.'
    ]
  },
  {
    num: '5',
    title: 'Conduct — the floor rules',
    items: [
      'No harassment, threats, or stalking. No explicit content. No minors. No hate. No spam or solicitation. No sharing other people\u2019s private info. No impersonation.',
      'Violations escalate: warning → temporary timeout → permanent bounce.'
    ]
  },
  {
    num: '6',
    title: 'Refunds',
    items: [
      'No match on the Dance Floor = automatic, private token refund. Silent loss, public win.',
      'Event canceled for low fill = automatic refund.',
      'Token pack purchases follow Stripe\u2019s refund process.',
      'Monetary disputes are handled by Stripe — we intervene only when a situation escalates beyond them.'
    ]
  },
  {
    num: '7',
    title: 'Liability',
    items: [
      'The club is provided as-is. We don\u2019t guarantee matches, responses, or outcomes — we guarantee a fun, fair, safe room.',
      'You\u2019re responsible for what you post and who you meet. Meet safely.'
    ]
  },
  {
    num: '8',
    title: 'Changes to the rules',
    items: [
      'Rule changes are announced before they take effect. Material changes require fresh consent.'
    ]
  }
];

export default function TermsPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          📜 The Rules of the Club
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Terms of Service. Every club has its rules — Brutus enforces these,
          and the code is built to match them.
        </p>

        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <div
              key={s.num}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <h2 className="font-bold">
                <span className="mr-2 text-club">{s.num}.</span>
                {s.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                    <span className="text-club">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-zinc-600">
          Policy source: docs/Governance/terms.md (binding on the build). Living
          document — refined as the club grows.
        </p>

        <p className="mt-4 text-sm text-zinc-400">
          Questions about the rules? Write the club at{' '}
          <a
            href={`mailto:${CONTACT.clubCheeky}`}
            className="text-club underline hover:text-club-cotton"
          >
            {CONTACT.clubCheeky}
          </a>
          .
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/privacy"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            Read the Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
