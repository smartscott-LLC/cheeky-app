'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buyGift, respondGift, sendGift } from '@/app/gifts/actions';

export interface GiftPerson {
  id: string;
  display_name: string | null;
  photo: string | null;
}

export interface GiftShopProps {
  tokenBalance: number;
  tierLabel: string;
  catalog: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
    floor: string;
    token_cost: number;
    kind: string;
  }[];
  stash: {
    id: string;
    name: string;
    emoji: string;
    floor: string;
  }[];
  incoming: {
    id: string;
    name: string;
    emoji: string;
    sender: GiftPerson;
  }[];
  sent: {
    id: string;
    name: string;
    emoji: string;
    status: string;
    recipientName: string;
  }[];
  people: GiftPerson[];
  photoBase: string;
}

const FLOOR_LABEL: Record<string, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond'
};

const FLOOR_ORDER = ['silver', 'gold', 'platinum', 'diamond'];

function giftPitch(g: {
  kind: string;
  name: string;
  emoji: string;
  floor: string;
}): string {
  if (g.kind === 'basket')
    return 'All four, one gift — 75 tokens off. Announces + full pass.';
  if (g.kind === 'featured')
    return 'Announces on the ticker. Accept = a 2-hour pass + a date room.';
  return 'A silent gesture — just showing interest. No announcement.';
}

function describe(code: string): string {
  switch (code) {
    case 'insufficient_tokens':
      return 'Not enough tokens for the bar. Buy a pack or earn some, then come back.';
    case 'tier_required':
      return 'That gift lives on a higher floor — climb the ladder first.';
    case 'send_cooldown':
      return 'One gift offer per hour. The ticker needs a breather — try again soon.';
    case 'blocked':
      return 'This person blocked you, or you blocked them.';
    case 'gift_not_available':
      return 'That gift is already out of your hands.';
    default:
      return 'Could not do that. Try again.';
  }
}

export default function GiftShop({
  tokenBalance,
  tierLabel,
  catalog,
  stash,
  incoming,
  sent,
  people,
  photoBase
}: GiftShopProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sendFor, setSendFor] = useState<{
    giftId: string;
    name: string;
  } | null>(null);
  const [recipient, setRecipient] = useState('');

  const run = async (key: string, fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (res.error) {
      setError(describe(res.error));
      return;
    }
    setSendFor(null);
    setRecipient('');
    router.refresh();
  };

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg border border-club/40 bg-club/10 px-4 py-2 text-base text-club">
          {error}
        </p>
      )}

      {/* Incoming */}
      {incoming.length > 0 && (
        <div className="mb-8 rounded-xl border border-gold bg-diamond/5 p-6">
          <h2 className="font-header text-cyan text-2xl">💝 Someone sent you a gift</h2>
          <ul className="mt-4 space-y-3">
            {incoming.map((g) => (
              <li
                key={g.id}
                className="text-club flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-800">
                    {g.sender.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${photoBase}${g.sender.photo}`}
                        alt={g.sender.display_name || 'Member'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-cyan">
                        {(g.sender.display_name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-header text-cyan text-lg">
                      {g.sender.display_name || 'Member'}
                    </p>
                    <p className="text-base text-club">
                      sent you {g.emoji} {g.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      run(`accept-${g.id}`, () => respondGift(g.id, true))
                    }
                    disabled={busy === `accept-${g.id}`}
                    className="rounded-lg bg-club px-4 py-2 text-sm font-bold text-white transition hover:bg-club-cotton"
                  >
                    Accept — come see the floor
                  </button>
                  <button
                    onClick={() =>
                      run(`deny-${g.id}`, () => respondGift(g.id, false))
                    }
                    disabled={busy === `deny-${g.id}`}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-cyan hover:border-zinc-500"
                  >
                    Pass
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* The store */}
        <div className="rounded-xl border border-gold bg-zinc-900/50 p-6">
          <h2 className="font-header text-cyan text-2xl">🍸 The Bar</h2>
          <p className="mt-1 text-base text-club">
            {tokenBalance} tokens · {tierLabel} floor · you can buy your floor
            and below
          </p>
          <div className="mt-4 space-y-6">
            {FLOOR_ORDER.map((floor) => {
              const floorGifts = catalog
                .filter((g) => g.floor === floor)
                .sort((a, b) => {
                  const rank = (k: string) =>
                    k === 'featured' ? 0 : k === 'basket' ? 0 : 1;
                  return (
                    rank(a.kind) - rank(b.kind) || a.token_cost - b.token_cost
                  );
                });
              const basket = catalog.find((g) => g.kind === 'basket');
              const showBasket = floor === 'silver' && basket;
              if (floorGifts.length === 0 && !showBasket) return null;
              return (
                <div key={floor}>
                  <h3 className="font-header text-cyan text-sm uppercase tracking-[0.3em]">
                    {FLOOR_LABEL[floor]} floor
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {floorGifts.map((g) => (
                      <div
                        key={g.id}
                        className="rounded-lg border border-gold bg-zinc-900/60 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{g.emoji}</span>
                          <span className="font-hero text-gold text-sm uppercase tracking-wide">
                            {g.kind === 'featured' ? '✨ Featured' : 'Gesture'}
                          </span>
                        </div>
                        <p className="font-header text-cyan mt-2 text-lg">{g.name}</p>
                        <p className="text-base text-club">{giftPitch(g)}</p>
                        <button
                          onClick={() =>
                            run(`buy-${g.slug}`, () => buyGift(g.slug))
                          }
                          disabled={busy === `buy-${g.slug}`}
                          className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-bold text-white transition ${
                            g.kind === 'featured'
                              ? 'bg-club hover:bg-club-cotton'
                              : 'bg-zinc-700 hover:bg-zinc-600'
                          }`}
                        >
                          {busy === `buy-${g.slug}`
                            ? 'Buying…'
                            : `Buy for ${g.token_cost} tokens`}
                        </button>
                      </div>
                    ))}
                    {showBasket && (
                      <div className="rounded-lg border border-gold/40 bg-gold/5 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{basket.emoji}</span>
                          <span className="font-hero text-gold text-sm uppercase tracking-wide">
                            Every floor
                          </span>
                        </div>
                        <p className="font-header text-cyan mt-2 text-lg">{basket.name}</p>
                        <p className="text-base text-club">
                          {giftPitch(basket)}
                        </p>
                        <button
                          onClick={() =>
                            run(`buy-${basket.slug}`, () => buyGift(basket.slug))
                          }
                          disabled={busy === `buy-${basket.slug}`}
                          className="mt-3 w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black transition hover:bg-gold-royal"
                        >
                          {busy === `buy-${basket.slug}`
                            ? 'Buying…'
                            : `Buy for ${basket.token_cost} tokens`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My stash + sent */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="font-header text-cyan text-2xl">🧥 My stash</h2>
            <p className="mt-1 text-base text-club">
              Your inventory. One offer per hour, and a denied gift comes right
              back here.
            </p>
            {stash.length === 0 ? (
              <p className="mt-4 text-base text-club">
                Nothing in the stash yet — buy something from the bar.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {stash.map((g) => (
                  <li
                    key={g.id}
                    className="text-club flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5"
                  >
                    <span className="font-header text-cyan text-base">
                      {g.emoji} {g.name}
                    </span>
                    <button
                      onClick={() => {
                        setSendFor({ giftId: g.id, name: g.name });
                        setRecipient('');
                      }}
                      className="rounded-md bg-platinum px-3 py-1 text-xs font-bold text-platinum-navy transition hover:bg-platinum-alice"
                    >
                      Send
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {sendFor && (
              <div className="mt-4 rounded-lg border border-platinum/30 bg-platinum/5 p-4">
                <p className="font-header text-cyan text-base">Send {sendFor.name} to…</p>
                {people.length === 0 ? (
                  <p className="mt-2 text-base text-club">
                    No one to send to yet — match or chat with someone first.
                  </p>
                ) : (
                  <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="mt-2 w-full rounded-lg bg-zinc-800 p-2.5 text-base text-white outline-none ring-platinum/50 focus:ring-2"
                  >
                    <option value="">Pick someone…</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || 'Member'}
                      </option>
                    ))}
                  </select>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      recipient &&
                      run(`send-${sendFor.giftId}`, () => sendGift(sendFor.giftId, recipient))
                    }
                    disabled={!recipient || busy === `send-${sendFor.giftId}`}
                    className="rounded-lg bg-platinum px-4 py-2 text-sm font-bold text-platinum-navy transition hover:bg-platinum-alice disabled:opacity-40"
                  >
                    Pop it — announce it
                  </button>
                  <button
                    onClick={() => setSendFor(null)}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-cyan hover:border-zinc-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {sent.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="font-header text-cyan text-2xl">📬 Out the door</h2>
              <ul className="mt-4 space-y-2">
                {sent.map((s) => (
                  <li
                    key={s.id}
                    className="text-club flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-base"
                  >
                    <span>
                      {s.emoji} {s.name} → {s.recipientName}
                    </span>
                    <span
                      className={`text-sm font-bold uppercase tracking-wide ${
                        s.status === 'accepted'
                          ? 'text-club'
                          : s.status === 'denied'
                            ? 'text-cyan'
                            : 'text-platinum'
                      }`}
                    >
                      {s.status === 'sent'
                        ? 'Waiting…'
                        : s.status === 'accepted'
                          ? 'Accepted!'
                          : 'Passed — back in your stash'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
