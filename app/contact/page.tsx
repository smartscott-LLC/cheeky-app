import Link from 'next/link';
import { CONTACT } from '@/utils/contact';

const DESKS = [
  {
    email: CONTACT.info,
    label: 'General inquiries',
    body: 'The front desk. Questions about the club, partnerships, press — start here.'
  },
  {
    email: CONTACT.helpdesk,
    label: 'Help & support',
    body: 'Billing, access, membership issues, or anything broken. Fastest path to a human.'
  },
  {
    email: CONTACT.clubCheeky,
    label: 'The club desk',
    body: 'Events, floors, the VIP experience — the things that make the club the club.'
  },
  {
    email: CONTACT.dateSafely,
    label: 'Safety & reporting',
    body: 'Report a concern, a safety issue, or anything that made you uncomfortable. Handled with care and confidentiality.'
  }
];

export default function ContactPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
          📞 Talk to the Club
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          A real human reads every desk. Pick the one that fits and we&apos;ll
          route it right — usually a same-day reply.
        </p>

        <div className="mt-10 space-y-4">
          {DESKS.map((d) => (
            <a
              key={d.email}
              href={`mailto:${d.email}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-club/50"
            >
              <p className="font-bold text-club">{d.label}</p>
              <p className="mt-1 text-sm text-zinc-400">{d.body}</p>
              <p className="mt-2 text-sm font-semibold text-white underline decoration-club/50">
                {d.email}
              </p>
            </a>
          ))}
        </div>

        <p className="mt-8 text-xs text-zinc-600">
          Emails are fielded through our parent mailbox (smartscott.com) and
          routed to the right desk. If it&apos;s an emergency involving someone
         &apos;s immediate safety, contact local emergency services first — then
          report it in-app.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold text-club transition hover:bg-club/10"
          >
            ← Back to the club
          </Link>
        </div>
      </div>
    </div>
  );
}
