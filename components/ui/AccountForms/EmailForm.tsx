'use client';

import Button from '@/components/ui/Button';
import { updateEmail } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EmailForm({
  userEmail
}: {
  userEmail: string | undefined;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    // Check if the new email is the same as the old email
    if (e.currentTarget.newEmail.value === userEmail) {
      e.preventDefault();
      setIsSubmitting(false);
      return;
    }
    handleRequest(e, updateEmail, router);
    setIsSubmitting(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="font-header text-cyan text-xl">Your email</h2>
      <p className="mt-1 text-sm text-club">
        Used for login and club contact. Personal — never shown on your profile.
      </p>
      <form
        id="emailForm"
        onSubmit={(e) => handleSubmit(e)}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          name="newEmail"
          className="flex-1 rounded-lg bg-zinc-800 p-3 text-white outline-none ring-club/50 focus:ring-2"
          defaultValue={userEmail ?? ''}
          placeholder="Your email"
          maxLength={64}
        />
        <Button
          variant="slim"
          type="submit"
          form="emailForm"
          loading={isSubmitting}
        >
          Update Email
        </Button>
      </form>
      <p className="mt-3 text-xs text-club">
        We&apos;ll email you to verify the change.
      </p>
    </div>
  );
}
