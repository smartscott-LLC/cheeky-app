'use client';

import Button from '@/components/ui/Button';
import React from 'react';
import Link from 'next/link';
import { signUp } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Define prop type with allowEmail boolean
interface SignUpProps {
  allowEmail: boolean;
  redirectMethod: string;
}

export default function SignUp({ allowEmail, redirectMethod }: SignUpProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true); // Disable the button while the request is being handled
    await handleRequest(e, signUp, redirectMethod === 'client' ? router : null);
    setIsSubmitting(false);
  };

  return (
    <div className="my-8">
      <form
        noValidate={true}
        className="mb-4"
        onSubmit={(e) => handleSubmit(e)}
      >
        <div className="grid gap-2">
          <div className="grid gap-1">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="w-full p-3 rounded-md bg-zinc-800"
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              placeholder="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              className="w-full p-3 rounded-md bg-zinc-800"
            />
            <label htmlFor="birthday">Date of birth</label>
            <input
              id="birthday"
              type="date"
              name="birthday"
              required
              className="w-full p-3 rounded-md bg-zinc-800 [color-scheme:dark]"
            />
            <p className="text-xs text-zinc-500">
              You must be 18 or older. Brutus double-checks it at the door.
            </p>
            <label htmlFor="messageRetentionDays">
              How long should we keep your conversations?
            </label>
            <select
              id="messageRetentionDays"
              name="messageRetentionDays"
              className="w-full p-3 rounded-md bg-zinc-800"
              defaultValue="90"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
            <p className="text-xs text-zinc-500">
              Messages are purged after your window. In a chat, the stricter
              window wins.
            </p>
            <label className="mt-2 flex items-start gap-3 text-sm text-zinc-300">
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
          </div>
          <Button
            variant="slim"
            type="submit"
            className="mt-1"
            loading={isSubmitting}
          >
            Sign up
          </Button>
        </div>
      </form>
      <p>Already have an account?</p>
      <p>
        <Link href="/signin/password_signin" className="font-light text-sm">
          Sign in with email and password
        </Link>
      </p>
      {allowEmail && (
        <p>
          <Link href="/signin/email_signin" className="font-light text-sm">
            Sign in via magic link
          </Link>
        </p>
      )}
    </div>
  );
}
