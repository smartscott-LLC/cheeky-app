'use client';

import { checkInAtTheDoor } from '@/app/verify/actions';
import Link from 'next/link';

const ERRORS: Record<string, string> = {
  consent: 'Brutus needs all four boxes checked before he checks your ID.',
  honeypot: 'Please complete the form to enter.',
  gender: 'The club needs to know who you are — gentleman or lady?',
  form: 'Check your email and password and try again.',
  taken:
    'That email is already in the club. Sign in instead — or use a different address.',
  signup: 'Something went wrong at the door. Please try again.'
};

/**
 * The one-stop door with Brutus: account details + all four consents in one
 * shot, then straight into the ID check. No birthday — Stripe verifies it
 * and hands it back through the webhook. Email verification comes last.
 */
export default function CheckInForm({ error }: { error?: string | null }) {
  return (
    <div className="mx-auto mt-10 max-w-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-club text-2xl">
          💪
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">Brutus the Bouncer</h2>
          <p className="text-sm text-zinc-400">The Door Check</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-400">
        One stop: your details and your consents right here, then the ID check —
        then you&apos;re in. Everything at the door, nothing twice.
      </p>

      {error && ERRORS[error] && (
        <p className="mt-4 rounded-md border border-club/50 bg-club/10 px-3 py-2 text-sm text-club">
          {ERRORS[error]}
        </p>
      )}

      <form action={checkInAtTheDoor} className="mt-6 space-y-4">
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <div className="grid gap-2">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            placeholder="name@example.com"
            type="email"
            name="email"
            required
            autoCapitalize="none"
            autoComplete="email"
            className="w-full rounded-md bg-zinc-800 p-3"
          />

          <label htmlFor="full_name">Your name</label>
          <input
            id="full_name"
            placeholder="How the club will know you"
            type="text"
            name="full_name"
            autoComplete="name"
            className="w-full rounded-md bg-zinc-800 p-3"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            placeholder="Password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
            className="w-full rounded-md bg-zinc-800 p-3"
          />

          <label htmlFor="gender">What are you?</label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className="w-full rounded-md bg-zinc-800 p-3"
          >
            <option value="" disabled>
              Choose one
            </option>
            <option value="gentleman">Gentleman</option>
            <option value="lady">Lady</option>
          </select>
          <p className="text-xs text-zinc-500">
            The club pairs real gentlemen and real ladies — no surprises.
          </p>

          <label htmlFor="interestedIn">Dating preference</label>
          <select
            id="interestedIn"
            name="interestedIn"
            defaultValue="everyone"
            className="w-full rounded-md bg-zinc-800 p-3"
          >
            <option value="everyone">Both</option>
            <option value="women">Ladies</option>
            <option value="men">Gentlemen</option>
          </select>

          <label htmlFor="messageRetentionDays">
            How long should we keep your conversations?
          </label>
          <select
            id="messageRetentionDays"
            name="messageRetentionDays"
            defaultValue="90"
            className="w-full rounded-md bg-zinc-800 p-3"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>

        {/* All four consents, in one place with Brutus */}
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="termsConsent"
              required
              className="mt-1 h-4 w-4 accent-club"
            />
            <span>I agree to the Rules of the Club (Terms) v1.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="privacyConsent"
              required
              className="mt-1 h-4 w-4 accent-club"
            />
            <span>I&apos;ve read What the Bouncer Knows (Privacy) v1.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="bestPracticesConsent"
              required
              className="mt-1 h-4 w-4 accent-club"
            />
            <span>
              I understand the club is in-app — meeting up or moving outside the
              app is my choice, on me. Read the{' '}
              <Link href="/best-practices" className="text-club underline">
                Best Practices
              </Link>{' '}
              (v1).
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="verificationConsent"
              required
              className="mt-1 h-4 w-4 accent-club"
            />
            <span>
              I consent to identity verification via Stripe Identity. My name,
              date of birth, and government ID number are checked against
              government and third-party databases, and are never stored by Club
              Cheeky. (Verification policy v1)
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-club px-6 py-3 text-lg font-bold text-white transition hover:bg-club-cotton"
        >
          Check in with Brutus
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already a member?{' '}
        <Link
          href="/signin"
          className="font-semibold text-club hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
