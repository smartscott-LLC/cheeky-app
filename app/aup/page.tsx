import Link from 'next/link';

const SECTIONS = [
  {
    num: '1',
    title: 'Prohibited content & activity — zero tolerance',
    intro:
      'The following categories are strictly prohibited on Club Cheeky, on every surface — profiles, messages, events, and elsewhere. Violations are permanent-bounce offenses; where the law requires, we preserve records, report to the authorities, and cooperate fully with law enforcement.',
    items: [
      'CSAM (Child Sexual Abuse Material) — any sexualized content involving a minor. Zero tolerance: permanent removal, record preservation, and mandatory reporting to NCMEC (CyberTipline) and law enforcement. The door is 18+ enforced by government ID verification.',
      'Public-facing sexually explicit content — no sexually explicit media or content anywhere on the platform, including profile photos and public surfaces. Profiles must be appropriate for public display; explicit content is removed immediately.',
      'Non-consensual content — content created or shared without the consent of everyone depicted, including non-consensual intimate imagery and accounts created without a person\u2019s consent. Confirmed cases are permanently removed and may be referred to law enforcement.',
      'Sexual violence — any content promoting, depicting, or threatening sexual violence, coercion, or assault. Zero tolerance: permanent bounce and cooperation with law enforcement.',
      'Human / sex trafficking — any solicitation, facilitation, or promotion of trafficking, forced labor, or coerced exploitation. Zero tolerance: permanent removal and reporting to the authorities.',
      'Fraudulent activities — scams, phishing, deceptive solicitations, payment or token fraud, fake-account fraud, or any attempt to defraud members or the platform. Accounts are removed and suspected fraud is reported to appropriate authorities.'
    ]
  },
  {
    num: '2',
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
    num: '3',
    title: 'How violations escalate',
    items: [
      'Warning → temporary timeout → permanent bounce. Severity matters: threats and illegal content skip straight to a permanent bounce.',
      'The escalation is private. No public callouts, no shaming — the door just quietly closes.',
      'Appeals go to the helpdesk; a human reviews every one.'
    ]
  },
  {
    num: '4',
    title: 'Reporting & blocking',
    items: [
      'Report or block from any chat, one tap. Reports go to a human bouncer for review — no automated bans on word filters alone.',
      'No follow-ups after a decline. You said no; that\u2019s the whole sentence.',
      'If you feel unsafe, report immediately — and reach out at date.safely@smartscott.online for a direct line to the safety desk.',
      'Prefer to stay anonymous? report-anonymous@smartscott.online — no name, no trace, still read by a human.'
    ]
  },
  {
    num: '5',
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
        <h1 className="font-hero text-gold text-center text-3xl sm:text-4xl">
          ⚖️ Acceptable Use Policy
        </h1>
        <p className="font-body font-body text-club mx-auto mt-3 max-w-xl text-center">
          How we keep the floor safe — what&apos;s allowed, what isn&apos;t, and
          what happens when someone crosses the line.
        </p>

        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <div
              key={s.num}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <h2 className="font-header text-cyan">
                <span className="mr-2 font-body font-body text-club">{s.num}.</span>
                {s.title}
              </h2>
              {s.intro && (
                <p className="font-body font-body text-club mt-3 text-sm">{s.intro}</p>
              )}
              <ul className="mt-3 space-y-2">
                {s.items.map((item) => (
                  <li
                    key={item}
                    className="font-body font-body text-club flex items-start gap-3 text-sm"
                  >
                    <span className="font-body font-body text-club">✓</span>
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
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold font-body font-body text-club transition hover:bg-club/10"
          >
            ← Terms of Use
          </Link>
          <Link
            href="/privacy"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold font-body font-body text-club transition hover:bg-club/10"
          >
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
