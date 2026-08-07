'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface MomentCharacter {
  slug: string;
  name: string;
  portrait_path: string | null;
}

interface Moment {
  id: string;
  milestone: string;
  message: string;
  created_at: string;
  seen_at: string | null;
  characters: MomentCharacter | null;
}

const MILESTONE_LABEL: Record<string, string> = {
  verification: 'Verified',
  first_match: 'First match',
  membership: 'Membership upgraded',
  gift_accepted: 'Gift accepted'
};

/**
 * The cast stopped by — recent milestone greetings from the characters,
 * newest first. Marks them seen when the strip loads, so the 🎭 concierge
 * badge clears once you've read the club.
 */
export default function MomentsStrip() {
  const supabase = createClient();
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('character_moments')
        .select(
          'id, milestone, message, created_at, seen_at, characters(slug, name, portrait_path)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      if (!cancelled && data) {
        setMoments(data as Moment[]);
      }

      const { error } = await supabase
        .from('character_moments')
        .update({ seen_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('seen_at', null);
      if (error) console.error('mark moments seen failed:', error.message);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (moments.length === 0) return null;

  return (
    <div className="mt-8 rounded-xl border border-club/30 bg-club/5 p-5">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-club">
        👋 The crew stopped by
      </p>
      <div className="mt-4 space-y-3">
        {moments.map((m) => (
          <div key={m.id} className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-club/30 bg-zinc-800">
              {m.characters?.portrait_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/${m.characters.portrait_path}`}
                  alt={m.characters.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base font-bold text-cyan">
                  {m.characters?.name?.charAt(0) ?? '?'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-club flex flex-wrap items-baseline gap-x-2 text-base">
                <span className="font-bold text-white">
                  {m.characters?.name ?? 'The Crew'}
                </span>
                <span className="text-sm text-cyan">
                  {MILESTONE_LABEL[m.milestone] ?? m.milestone} ·{' '}
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </p>
              <p className="mt-0.5 text-base text-club">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
