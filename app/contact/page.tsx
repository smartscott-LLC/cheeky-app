import Link from 'next/link';
import '@/styles/globals.css';

export default function ContactPage() {
  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-hero text-gold text-center text-3xl sm:text-4xl">
          📞 Talk to the Club
        </h1>
        <p className="font-body text-club mx-auto mt-3 max-w-xl text-center">
          A real human reads every message. Pick a desk that fits and we&apos;ll
          route it right — usually a same-day reply.
        </p>

        <div className="mt-10 text-center">
          <a
            href="https://forms.smartscott.online/forms/cheeky"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl border border-gold/50 bg-zinc-900/70 p-8 transition hover:border-gold hover:bg-zinc-900"
          >
            <p className="font-hero text-gold text-2xl">📋 Open Contact Form</p>
            <p className="font-body text-club mt-3 max-w-md">
              General inquiries, help &amp; support, the club desk, safety
              reporting, or anonymous reporting — pick the right desk on the
              form and it lands where it needs to go.
            </p>
          </a>
        </div>

        <p className="font-body text-club mt-8 text-xs text-center">
          If it&apos;s an emergency involving someone&apos;s immediate safety,
          contact local emergency services first — then report it in-app.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-lg border border-club/40 px-6 py-2.5 font-semibold font-body text-club transition hover:bg-club/10"
          >
            ← Back to the club
          </Link>
        </div>
      </div>
    </div>
  );
}
