import Link from 'next/link';

const SECTIONS = [
  {
    num: '1',
    title: 'The floor rules',
    items: [
      'No harassment, threats, or stalking — in messages, events, or anywhere in the club.',
      'No explicit content. No minors. This is an 18+ room, and the door checks.',
      'No hate, bigotry, or targeted abuse of any kind.',
      'No spam, solicitation, or scams — no selling, no promoting, no link-dropping.',
      'No sharing anyone else\u2019s private information (doxxing is a permanent bounce).',
      'No impersonation. You are who you say you are — the door checks that too.'
    ]
  },
  {
    num: '2',
    title: 'How violations escalate',
    items: [
      'Warning → temporary timeout → permanent bounce. Severity matters: threats and illegal content skip straight to a permanent bounce.',
      'The escalation is private. No public callouts, no shaming — the door just quietly closes.',
      'Appeals go to the helpdesk; a human reviews every one.'
    ]
  },
  {
    num: '3',
    title: 'Reporting & blocking',
    items: [
      'Report or block from any chat, one tap. Reports go to a human bouncer for review — no automated bans on word filters alone.',
      'No follow-ups after a decline. You said no; that\u2019s the whole sentence.',
      'If you feel unsafe, report immediately — and reach out at date.safely@smartscott.online for a direct line to the safety desk.'
    ]
  },
  {
    num: '4',
    title: 'Bots & fake accounts',
    items: [
      'The door runs honeypots — traps that only bots fill out. Caught bots are flagged and shut down: no messages, no likes, no waves, no events.',
      'The crew (Brutus, Roxy, the DJ, and friends) are AI characters, clearly labeled — they never pretend to be real people.',
      'Real people get real conversations. If it feels like a script, it probably is — report it.'
    ]
  }
];

export default function AupPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          ⚖️ Acceptable Use Policy
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          How we keep the floor safe — what&apos;s allowed, what isn&apos;t, and
          what happens when someone crosses the line.
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

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/terms"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            ← Terms of Use
          </Link>
          <Link
            href="/privacy"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
