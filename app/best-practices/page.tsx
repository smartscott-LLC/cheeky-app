import Link from 'next/link';
import { CONTACT } from '@/utils/contact';

const PRACTICES = [
  {
    emoji: '🚪',
    title: 'Stay in the club',
    body: 'Keep the conversation inside Club Cheeky. If someone pushes you to another app or phone early, slow down and trust your gut.'
  },
  {
    emoji: '🪪',
    title: 'The badge is real, the future is not guaranteed',
    body: 'Verification means a real ID cleared Brutus. It does not guarantee character — take your time, never rush.'
  },
  {
    emoji: '🚫',
    title: 'Never send money',
    body: 'Anyone asking for money, gift cards, crypto, or "help with an emergency" is a scammer. Report and block them.'
  },
  {
    emoji: '🤫',
    title: 'Personal info is earned, not owed',
    body: 'Share what you want, when you want. Nobody is entitled to your address, workplace, or full name.'
  },
  {
    emoji: '✋',
    title: 'No means no, and silence is a no',
    body: 'A decline is final — no follow-ups, no re-approaches. That is the rule of the floor.'
  },
  {
    emoji: '🛡️',
    title: 'Trust the tools',
    body: 'Report and block are one tap away, from any chat. Every report gets a human review.'
  }
];

const MEET_SAFE = [
  'Meet in a public place and tell a friend where you are going.',
  'Arrange your own transportation — keep your own exit plan.',
  'Stay sober enough to stay in control.',
  'Check in with someone you trust before and after.'
];

export default function BestPracticesPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🛡️ Best Practices
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          How to stay safe and get the most out of the club. Brutus enforces the
          door — these keep you steady on the floor.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PRACTICES.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <p className="text-2xl">{p.emoji}</p>
              <h2 className="mt-2 font-bold">{p.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-club/30 bg-club/5 p-6">
          <h2 className="text-xl font-bold">Meeting in person</h2>
          <p className="mt-2 text-sm text-zinc-300">
            If you decide to meet someone in person, exchange physical phone
            numbers, or interact outside the app:
          </p>
          <ul className="mt-4 space-y-2">
            {MEET_SAFE.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-3 text-sm text-zinc-300"
              >
                <span className="text-club">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
          <h2 className="font-bold text-white">📄 Disclaimer</h2>
          <p className="mt-2">
            Club Cheeky is an in-app club. If you choose to meet someone in
            person, exchange phone numbers, or interact with anyone outside of
            the app, you do so at your own risk. Club Cheeky is not responsible
            for anything that happens outside of the app. We provide the venue
            and the tools — your safety in the real world is in your own hands.
            Meet smart, and come back.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            You acknowledged this at signup (Best Practices v1). Policy:
            docs/Governance/best-practices.md.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-platinum/30 bg-platinum/5 p-6 text-sm">
          <h2 className="font-bold text-white">📮 Something feel off?</h2>
          <p className="mt-2 text-zinc-300">
            If something happened that made you feel unsafe — on the app or on a
            date — write the front desk at{' '}
            <a
              href={`mailto:${CONTACT.dateSafely}`}
              className="text-club underline hover:text-club-cotton"
            >
              {CONTACT.dateSafely}
            </a>
            . It goes straight to the club and we take it from there.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/signin/signup"
            className="inline-block rounded-lg bg-club px-8 py-3 font-bold text-white transition hover:bg-club-cotton"
          >
            Enter the club
          </Link>
        </div>
      </div>
    </div>
  );
}
