import Link from 'next/link';
import { CONTACT } from '@/utils/contact';

const SECTIONS = [
  {
    num: '1',
    title: 'The short version',
    items: [
      'We comply with valid legal process — subpoenas, court orders, and warrants — served on us in the proper way.',
      'We do not voluntarily disclose member data without valid process. That includes requests that arrive informally, by phone, or in chat.',
      'In an emergency involving immediate danger, we can act faster — law enforcement contacting us with an emergency request will get priority handling.'
    ]
  },
  {
    num: '2',
    title: 'What we hold',
    items: [
      'We hold the minimum to run the club: an account, a verification status (we never store raw ID material), messages per the retention you chose, and records like reports and blocks.',
      'Full detail is in the Privacy Policy — this page covers how those records are reached by process, not what they contain.',
      'Account records are preserved on a valid preservation request while a proper request is obtained.'
    ]
  },
  {
    num: '3',
    title: 'How to reach us',
    items: [
      'Legal process should be served on our registered contact at the address on file, with a copy to the club mailbox below.',
      'For the fastest handling of a legitimate request, include the account identifier (email), the time window, and the specific records sought.',
      'We route legal mail to the founder\u2019s desk (smartscott.com); it is fielded by real humans, not auto-replies.'
    ]
  },
  {
    num: '4',
    title: 'What we tell the member',
    items: [
      'Where we are legally permitted to, we notify the account holder that a request was received before we produce anything.',
      'We push back on overbroad requests and will not hand over more than the process demands.',
      'Cooperation with lawful process never means cooperation with harassment — the AUP still applies to everyone, including agencies.'
    ]
  }
];

export default function LawEnforcementPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🛡️ Law Enforcement
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          How official requests for Club Cheeky account data are handled.
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

        <p className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-400">
          <span className="font-bold text-white">Legal contact:</span>{' '}
          <a
            href={`mailto:${CONTACT.info}`}
            className="text-club underline hover:text-club-cotton"
          >
            {CONTACT.info}
          </a>{' '}
          — with a copy to the helpdesk ({CONTACT.helpdesk}) for tracking.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/privacy"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            ← Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
