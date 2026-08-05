import Link from 'next/link';
import { CONTACT } from '@/utils/contact';

const SECTIONS = [
  {
    num: '1',
    title: 'What tokens are',
    items: [
      'Tokens are in-app currency for events and gifts. They are not redeemable for cash, not transferable between users, and not an investment.',
      'You earn them (verification, referrals, giveaways) or buy them (100 for $4.99, 1000 for $9.99). Money buys floors and tokens — never entry.',
      'Tokens are never spent on messaging. Ever.'
    ]
  },
  {
    num: '2',
    title: 'The no-match rule — automatic and private',
    items: [
      'Joining an event places a hold on the entry tokens; it is not a charge yet.',
      'No match, no timeout payout? The hold is released — your tokens come back automatically. No form, no waiting, no fuss.',
      'It happens quietly. Silent loss, public win — rejection is always private.',
      'A match? The hold converts to the entry cost and the song plays. That\u2019s the deal.'
    ]
  },
  {
    num: '3',
    title: 'Canceled events',
    items: [
      'If an event is canceled (for example, not enough people to fill the floor), every reservation is automatically refunded in full.',
      'You keep the same spot in line for the next set — nothing lost.'
    ]
  },
  {
    num: '4',
    title: 'Purchases & memberships',
    items: [
      'Token pack purchases and membership payments follow Stripe\u2019s refund process — the payment processor owns the money side, and disputes are final through them.',
      'Memberships can be canceled anytime, in one click, from your Account page. No phone calls, no retention scripts.',
      'We step into a money dispute only when it escalates beyond the processor (fraud rings, account-level issues) — otherwise Stripe handles it end to end.'
    ]
  },
  {
    num: '5',
    title: 'Where to go with a problem',
    items: [
      'Billing or charge questions → the helpdesk, or directly with Stripe through your receipt.',
      'Anything else → the club desk. A human reads it.',
      'Refund requests are handled in the order they arrive; automatic refunds (no-match, canceled events) never need a request at all.'
    ]
  }
];

export default function RefundsPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          💸 Refund Policy
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Tokens, no-match refunds, canceled events, and where the money belongs
          when it goes sideways.
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
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-zinc-400"
                  >
                    <span className="text-club">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-zinc-400">
          Questions? Write{' '}
          <a
            href={`mailto:${CONTACT.helpdesk}`}
            className="text-club underline hover:text-club-cotton"
          >
            {CONTACT.helpdesk}
          </a>
          .
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/terms"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            ← Terms of Use
          </Link>
        </div>
      </div>
    </div>
  );
}
