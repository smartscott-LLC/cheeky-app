'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { loungeInvite } from '@/app/chat/actions';

export interface LoungePerson {
  id: string;
  name: string;
}

interface Props {
  x: number;
  y: number;
  person: LoungePerson;
  meId: string;
  onClose: () => void;
  onWhisper: (p: LoungePerson) => void;
  onPrivate: (p: LoungePerson, inviteId: string) => void;
  onMute: (id: string) => void;
}

type View = 'menu' | 'private' | 'report' | 'gift';

/**
 * The right-click / long-press menu on any Lounge message. Everything a
 * chat room does: go private (the consent-gated match invite), whisper,
 * mute (hide for you), block (blocks table), report (AI + human queue),
 * and give a gift from your inventory (same rules as the shop).
 */
export default function ClubChatMenu({ x, y, person, meId, onClose, onWhisper, onPrivate, onMute }: Props) {
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [gifts, setGifts] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [giftError, setGiftError] = useState<string | null>(null);

  const supabase = createClient();

  // Clamp the menu to the viewport.
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - 260);

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
    onPrivate(person, res.inviteId!);
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

  const menuItem = (label: string, onClick: () => void, danger = false) => (
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
        className="fixed z-[70] w-60 rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl"
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
      className="fixed z-[70] w-60 rounded-xl border border-gold/40 bg-zinc-950 p-2 shadow-[0_0_30px_rgba(255,215,0,0.1)]"
    >
      {view === 'menu' && (
        <>
          <p className="border-b border-zinc-800 px-3 py-1.5 text-xs font-bold text-cyan">
            {person.name}
          </p>
          {menuItem('💬 Go private', () => setView('private'))}
          {menuItem('🤫 Whisper', () => onWhisper(person))}
          {menuItem('🔇 Mute', () => {
            onMute(person.id);
            onClose();
          })}
          {menuItem('🚫 Block', block, true)}
          {menuItem('⚠️ Report', () => setView('report'), true)}
          {menuItem('🎁 Give a gift', openGifts)}
        </>
      )}

      {view === 'private' && (
        <div className="p-2">
          <p className="text-sm text-club">
            Inviting <span className="font-bold text-cyan">{person.name}</span> to a private
            chat <span className="font-bold text-gold">constitutes a match</span>. If they
            accept, it counts against your new-people and message allowances for the day.
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
