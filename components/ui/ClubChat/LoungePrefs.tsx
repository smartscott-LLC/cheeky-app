'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { loungePrefs } from '@/app/chat/actions';

/**
 * The Lounge & gifts privacy toggles — switch off private invites and/or
 * gifts so a busy member can't be spammed with either. Senders get told
 * "this user does not accept…" when they try.
 */
export default function LoungePrefs() {
  const [invites, setInvites] = useState<boolean | null>(null);
  const [gifts, setGifts] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('accepts_private_invites, accepts_gifts')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setInvites(data.accepts_private_invites);
        setGifts(data.accepts_gifts);
      }
    })();
  }, []);

  const toggle = async (which: 'invites' | 'gifts', value: boolean) => {
    if (invites === null || gifts === null || busy) return;
    setBusy(true);
    setSaved(false);
    const nextInvites = which === 'invites' ? value : invites;
    const nextGifts = which === 'gifts' ? value : gifts;
    const res = await loungePrefs(nextInvites, nextGifts);
    setBusy(false);
    if (res.error) return;
    setInvites(nextInvites);
    setGifts(nextGifts);
    setSaved(true);
  };

  if (invites === null || gifts === null) return null;

  const Row = ({
    label,
    hint,
    on,
    onToggle
  }: {
    label: string;
    hint: string;
    on: boolean;
    onToggle: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs font-body text-club">{hint}</p>
      </div>
      <button
        onClick={() => onToggle(!on)}
        disabled={busy}
        aria-pressed={on}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${
          on ? 'bg-gold' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="font-header text-cyan text-xl">🍸 The Lounge & gifts</h2>
      <div className="mt-2 divide-y divide-zinc-800">
        <Row
          label="Accept private invites"
          hint="When off, the Lounge says “this user does not accept private invites.”"
          on={invites}
          onToggle={(v) => toggle('invites', v)}
        />
        <Row
          label="Accept gifts"
          hint="When off, senders are refused with “this user does not accept gifts.”"
          on={gifts}
          onToggle={(v) => toggle('gifts', v)}
        />
      </div>
      {saved && <p className="mt-2 text-xs text-gold">Saved.</p>}
    </div>
  );
}
