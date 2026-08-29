'use client';

import { useEffect, useState } from 'react';

interface Props {
  trigger: number;
}

// Confetti / horn-burst overlay. Trigger fires whenever the Horn lands
// (either the local user blasted it, or someone else's horn arrived in
// the room). Renders 24 particles + a center "🎺" stamp for ~1.5s.

const COLORS = ['#FFD700', '#22D3EE', '#F472B6', '#A78BFA', '#34D399', '#F87171'];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
}

export function HornBurst({ trigger }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [stamp, setStamp] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    const next: Particle[] = Array.from({ length: 28 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 80
    }));
    setParticles(next);
    setStamp(true);
    const t = setTimeout(() => {
      setParticles([]);
      setStamp(false);
    }, 1600);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl">
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`
          }}
          className="absolute h-1.5 w-1.5 animate-[confetti_1.4s_ease-out_forwards] rounded-full"
        />
      ))}
      {stamp && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            key={Date.now()}
            className="animate-[hornStamp_1.4s_ease-out_forwards] text-5xl drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
          >
            🎺
          </span>
        </div>
      )}
    </div>
  );
}
