'use client';

import { useState } from 'react';

interface Person {
  id: string;
  name: string;
  image?: string | null;
}

interface Props {
  people: Person[];
  selfId: string;
  max?: number;
}

// Stacked avatar list with a "+N more" overflow chip. Hover any avatar
// to see the name in a tooltip. The self avatar gets a gold ring and a
// "You" label so the user always knows where they are in the room.

export function PresenceStack({ people, selfId, max = 9 }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = people.slice(0, max);
  const overflow = Math.max(0, people.length - shown.length);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        In the room
      </span>
      <div className="flex -space-x-2">
        {shown.map((p) => {
          const isMe = p.id === selfId;
          return (
            <div
              key={p.id}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              className={`relative h-7 w-7 overflow-hidden rounded-full border-2 transition hover:scale-110 hover:z-10 ${
                isMe
                  ? 'border-gold ring-2 ring-gold/40'
                  : 'border-zinc-800 hover:border-cyan/60'
              }`}
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-[10px] font-bold text-cyan">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              {hover === p.id && (
                <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
                  {isMe ? `${p.name} (you)` : p.name}
                </div>
              )}
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-300">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
