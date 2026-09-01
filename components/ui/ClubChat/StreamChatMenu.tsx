'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { loungeInvite } from '@/app/chat/actions';

export interface StreamPerson {
  id: string;
  name: string;
  image?: string | null;
  floor?: string | null;
}

interface Props {
  x: number;
  y: number;
  person: StreamPerson;
  meId: string;
  onClose: () => void;
  onWhisper: (p: StreamPerson) => void;
  onPrivate: (p: StreamPerson) => void;
  onMute: (id: string) => void;
}

type View = 'menu' | 'private' | 'report' | 'gift' | 'profile';

/**
 * Right-click / long-press menu on a Lounge message. Re-uses the
 * existing report, block, gift, and take-private flows (server-side),
 * and adds a profile peek with floor tag + a few flourishes.
 */
export default function StreamChatMenu({
  x,
  y,
  person,
  meId,
  onClose,
  onWhisper,
  onPrivate,
  onMute
}: Props) {
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [gifts, setGifts] = useState<{ id: string; name: string; emoji: string }[]>(
    []
  );
  const [giftError, setGiftError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    name: string;
    image: string | null;
    bio: string | null;
    one_liner: string | null;
    floor: string | null;
    verified_at: string | null;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const supabase = createClient();
  const left = Math.min(x, window.innerWidth - 240);
  const top = Math.min(y, window.innerHeight - 320);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const goPrivate = async () => {
    setBusy(true);
    const res = await loungeInvite(person.id);
    setBusy(false);
    if (res.error) {
      setMessage(
        res.error.includes('already_matched')
          ? 'You two are already matched — say hi from Cheeky Chats.'
          : res.error
      );
      return;
    }
    onPrivate(person);
  };

  const block = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: meId, blocked_id: person.id });
    setBusy(false);
    setMessage(error ? error.message : `Blocked — ${person.name} is hidden everywhere.`);
  };

  const report = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: meId,
      reported_id: person.id,
      reason: reason.trim(),
      context: 'club-chat'
    });
    setBusy(false);
    setMessage(error ? error.message : 'Reported — it goes to the AI and the humans.');
  };

  const openGifts = async () => {
    setView('gift');
    setGiftError(null);
    const { data, error } = await supabase
      .from('gift_inventory')
      .select('id, gift_catalog(name, emoji)')
      .eq('user_id', meId)
      .eq('status', 'available');
    if (error) {
      setGiftError(error.message);
      return;
    }
    setGifts(
      (data ?? []).map((g) => ({
        id: g.id,
        name: g.gift_catalog?.name ?? 'Gift',
        emoji: g.gift_catalog?.emoji ?? '🎁'
      }))
    );
  };

  const sendGift = async (giftId: string) => {
    setBusy(true);
    setGiftError(null);
    const { error } = await supabase.rpc('send_gift', {
      p_gift_id: giftId,
      p_recipient: person.id
    });
    setBusy(false);
    setMessage(
      error
        ? error.message.includes('not_your_gift')
          ? 'That gift is no longer in your stash.'
          : error.message
        : `Gift sent to ${person.name}.`
    );
  };

  const openProfile = async () => {
    setView('profile');
    setProfileLoading(true);
    const [{ data }, tierRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'display_name, bio, one_liner, verified_at, photos(storage_path, is_primary)'
        )
        .eq('id', person.id)
        .maybeSingle(),
      supabase.rpc('current_tier', { p_user: person.id })
    ]);
    if (!data) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    const primary = (data.photos ?? []).find(
      (p: { is_primary: boolean }) => p.is_primary
    );
    setProfile({
      name: (data.display_name as string) ?? 'Member',
      image: primary?.storage_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/${primary.storage_path}`
        : null,
      bio: (data.bio as string) ?? null,
      one_liner: (data.one_liner as string) ?? null,
      floor: (tierRes.data as string) ?? null,
      verified_at: (data.verified_at as string) ?? null
    });
    setProfileLoading(false);
  };

  const Item = ({
    label,
    onClick,
    danger
  }: {
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition hover:bg-zinc-800 ${
        danger ? 'text-club' : 'text-white'
      }`}
    >
      {label}
    </button>
  );

  if (message) {
    return (
      <div
        style={{ left, top }}
        className="fixed z-[70] w-60 rounded-xl border border-zinc-700 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur"
      >
        <p className="text-sm text-club">{message}</p>
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-black transition hover:bg-gold-royal"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ left, top }}
      className="fixed z-[70] w-60 rounded-xl border border-gold/40 bg-zinc-950/95 p-2 shadow-[0_0_30px_rgba(255,215,0,0.1)] backdrop-blur"
    >
      {view === 'menu' && (
        <>
          <p className="border-b border-zinc-800 px-3 py-1.5 text-xs font-bold text-cyan">
            {person.name}
          </p>
          <Item label="👤 View profile" onClick={openProfile} />
          <Item label="💬 Go private" onClick={() => setView('private')} />
          <Item label="🤫 Whisper" onClick={() => onWhisper(person)} />
          <Item
            label="🔇 Mute"
            onClick={() => {
              onMute(person.id);
              onClose();
            }}
          />
          <Item label="🚫 Block" onClick={block} danger />
          <Item label="⚠️ Report" onClick={() => setView('report')} danger />
          <Item label="🎁 Give a gift" onClick={openGifts} />
        </>
      )}

      {view === 'profile' && (
        <div className="p-2">
          {profileLoading && (
            <p className="text-sm text-club">Loading…</p>
          )}
          {profile && (
            <div>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-gold/50 bg-zinc-800">
                  {profile.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-cyan">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">
                    {profile.name}
                  </p>
                  <p className="text-xs text-cyan">
                    {profile.floor ? `${profile.floor} card` : 'Silver'}
                    {profile.verified_at ? ' · verified' : ''}
                  </p>
                </div>
              </div>
              {profile.one_liner && (
                <p className="mt-2 text-sm italic text-club">
                  &ldquo;{profile.one_liner}&rdquo;
                </p>
              )}
              {profile.bio && (
                <p className="mt-2 text-sm text-club line-clamp-3">
                  {profile.bio}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    onWhisper(person);
                    setView('menu');
                  }}
                  className="flex-1 rounded-md bg-cyan px-2 py-1 text-xs font-bold text-black"
                >
                  Whisper
                </button>
                <button
                  onClick={() => setView('private')}
                  className="flex-1 rounded-md bg-gold px-2 py-1 text-xs font-bold text-black"
                >
                  Go private
                </button>
              </div>
              <button
                onClick={() => setView('menu')}
                className="mt-2 w-full rounded-md border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'private' && (
        <div className="p-2">
          <p className="text-sm text-club">
            Inviting <span className="font-bold text-cyan">{person.name}</span> to a
            private chat <span className="font-bold text-gold">constitutes a match</span>.
            If they accept, it counts against your new-people and message allowances
            for the day.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            They&apos;ll see the same confirmation before it lands.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={goPrivate}
              disabled={busy}
              className="flex-1 rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-black transition hover:bg-gold-royal disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Yes — invite'}
            </button>
            <button
              onClick={() => setView('menu')}
              className="flex-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'report' && (
        <div className="p-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="What happened? (goes to AI + human review)"
            className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-club"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={report}
              disabled={!reason.trim() || busy}
              className="flex-1 rounded-lg bg-club px-3 py-1.5 text-sm font-bold text-white transition hover:opacity-80 disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Submit report'}
            </button>
            <button
              onClick={() => setView('menu')}
              className="flex-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'gift' && (
        <div className="p-2">
          <p className="text-xs font-bold text-cyan">Pick a gift for {person.name}</p>
          {giftError && <p className="mt-1 text-xs text-club">{giftError}</p>}
          {gifts.length === 0 && !giftError && (
            <p className="mt-2 text-sm text-club">Your stash is empty — grab one in the Gift Shop.</p>
          )}
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {gifts.map((g) => (
              <button
                key={g.id}
                onClick={() => sendGift(g.id)}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 px-2 py-1.5 text-left text-sm text-white transition hover:border-gold disabled:opacity-40"
              >
                <span>{g.emoji}</span>
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                {busy && <span className="text-xs text-club">…</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => setView('menu')}
            className="mt-2 w-full rounded-lg border border-zinc-700 px-3 py-1 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
