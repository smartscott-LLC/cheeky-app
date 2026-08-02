import Link from 'next/link';

const SECTIONS = [
  {
    title: 'What we collect',
    items: [
      'Account basics: email, password (via Supabase Auth), birthday — used only to confirm 18+, never shown publicly.',
      'Profile: photos, name, bio, preferences. Visible to other members by design — it\u2019s a club, not a vault.',
      'Verification result: result + timestamp + provider reference only. The ID documents, selfies, and ID numbers are processed by our verification provider (Stripe Identity) and are never stored by us.',
      'Messages: stored to deliver and to keep the floor safe.',
      'Token ledger: every earn, spend, and refund. This is financial data.',
      'Usage basics: how you use the app, to keep it working and secure.'
    ]
  },
  {
    title: 'What we do NOT do',
    items: [
      'We do not sell personal data. Not now, not ever.',
      'We do not share data with advertisers — there are no advertisers.',
      'We do not post your verification status beyond the badge you already show.',
      'We do not message other members on your behalf, ever.'
    ]
  },
  {
    title: 'Why we collect it',
    items: [
      'To run the club (accounts, billing, events), to keep it safe (verification, moderation), and to stay legal (age gate, financial records, refunds).'
    ]
  },
  {
    title: 'Your rights',
    items: [
      'See it: request a copy of your data.',
      'Fix it: update your profile anytime.',
      'Delete it: in-app account deletion.',
      'Complain: to us, and you always keep your rights under applicable law (e.g., GDPR/CCPA).'
    ]
  },
  {
    title: 'Consent',
    items: [
      'Verification and biometric processing has its own consent checkbox, separate from these terms. Brutus asks; you answer; that\u2019s the whole transaction.'
    ]
  }
];

export default function PrivacyPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          🛡️ What the Bouncer Knows
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Privacy Policy. The club keeps the door, not your secrets — here is
          exactly what we hold and why.
        </p>

        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <h2 className="font-bold">{s.title}</h2>
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
          Policy source: docs/Governance/privacy.md (binding on the build). Draft —
          final legal language with counsel before public launch.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/best-practices"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            Read the Best Practices →
          </Link>
        </div>
      </div>
    </div>
  );
}
