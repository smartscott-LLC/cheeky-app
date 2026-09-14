'use client';

import { useEffect, useRef } from 'react';

interface ProfileModalProps {
  person: {
    id: string;
    display_name: string | null;
    photo: string | null;
    verified_at: string | null;
    bio: string | null;
    one_liner: string | null;
  };
  photoBase: string;
  onClose: () => void;
}

/**
 * ProfileModal — shows public profile info for a member.
 * Triggered by clicking a card in event games, browse, etc.
 */
export default function ProfileModal({
  person,
  photoBase,
  onClose
}: ProfileModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click or Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleClickOutside = (e: React.MouseEvent) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const photo = person.photo ? `${photoBase}${person.photo}` : null;

  return (
    <div
      ref={overlayRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`Profile of ${person.display_name || 'member'}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        onClick={handleClickOutside}
        className="absolute inset-0 z-0"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gold/30 bg-zinc-950 shadow-[0_0_60px_rgba(255,215,0,0.15)]">
        {/* Photo */}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={person.display_name || 'Member'}
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 items-center justify-center bg-zinc-900">
            <span className="text-7xl font-extrabold text-cyan">
              {(person.display_name || '?').charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Info */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-header text-cyan text-2xl">
              {person.display_name || 'Member'}
            </h2>
            {person.verified_at && (
              <span className="rounded-full border border-club/40 bg-club/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide font-body text-club">
                Verified
              </span>
            )}
          </div>

          {person.one_liner && (
            <p className="mt-3 text-base font-body text-club">
              "{person.one_liner}"
            </p>
          )}

          {person.bio && (
            <p className="mt-2 text-base font-body text-club/80">
              {person.bio}
            </p>
          )}

          {!person.one_liner && !person.bio && (
            <p className="mt-2 text-sm font-body text-club/60 italic">
              They haven&apos;t written a bio yet.
            </p>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-lg border border-zinc-700 py-2.5 text-sm font-bold text-cyan transition hover:border-zinc-500 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
