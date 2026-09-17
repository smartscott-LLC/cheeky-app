'use client';

import { useState } from 'react';
import Image from 'next/image';

// ===== TYPES =====
export interface CardData {
  userId: string;
  name?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  age?: number;
  height?: string;
  hometown?: string;
  state?: string;
  rpgClass?: string;
  membershipLevel?: 'silver' | 'gold' | 'platinum' | 'diamond';
  avatarImageUrl?: string;
  showCard?: boolean; // user toggle
}

// ===== CARD COMPONENT =====
export default function QuestCard({ data }: { data: CardData }) {
  const [flipped, setFlipped] = useState(false);

  if (!data.showCard) return null;

  const isFemale = data.gender === 'female';
  const _isMale = data.gender === 'male';

  // Membership icon
  const membershipIcon =
    data.membershipLevel === 'diamond'
      ? '💎'
      : data.membershipLevel === 'platinum'
        ? '⬡'
        : data.membershipLevel === 'gold'
          ? '🪙'
          : '🥈';

  // Back design based on gender
  const backDesign = isFemale ? (
    <div className="absolute inset-0 flex items-center justify-center gap-2">
      <span className="text-6xl">❤️</span>
      <span className="text-6xl">❤️</span>
    </div>
  ) : (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-7xl opacity-80">🛡️</span>
    </div>
  );

  return (
    <div
      className="w-72 h-96 cursor-pointer perspective-1000"
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}
      >
        {/* FRONT — Custom back design */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden backface-hidden"
          style={{
            background:
              'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '3px solid',
            borderColor: isFemale ? '#FF69B4' : '#C0C0C0',
            boxShadow: '0 0 30px rgba(255,215,0,0.3)'
          }}
        >
          {/* Decorative border pattern */}
          <div className="absolute inset-3 border-2 border-gold/30 rounded-xl" />
          <div className="absolute inset-6 border border-gold/20 rounded-lg" />

          {/* Center design */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            {/* Title */}
            <div className="text-gold font-fascinate text-lg tracking-widest mb-6 uppercase">
              {isFemale ? 'Heroine' : 'Hero'}
            </div>

            {/* Gender symbol */}
            <div className="text-8xl mb-6">{isFemale ? '♀️' : '♂️'}</div>

            {/* Back design (hearts or shield) */}
            {backDesign}

            {/* Bottom text */}
            <div className="absolute bottom-8 text-cyan font-damion text-sm tracking-wider">
              {data.name || 'Unnamed Hero'}
            </div>
          </div>
        </div>

        {/* BACK — Character card */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden rotate-y-180 backface-hidden"
          style={{
            background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)',
            border: '3px solid #FFD700',
            boxShadow: '0 0 40px rgba(255,215,0,0.4)'
          }}
        >
          {/* Membership icon (top left) */}
          <div
            className="absolute top-3 left-3 z-20 text-2xl"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' }}
          >
            {membershipIcon}
          </div>

          {/* Main image area */}
          <div className="relative h-48 w-full overflow-hidden">
            {data.avatarImageUrl ? (
              <Image
                src={data.avatarImageUrl}
                alt={data.name || 'Avatar'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <span className="text-6xl">👤</span>
              </div>
            )}
            {/* Gradient overlay at bottom of image */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
          </div>

          {/* Bio section with avatar overlap */}
          <div className="relative px-4 pt-2 pb-12 min-h-24">
            {/* Name */}
            <div className="font-fascinate text-gold text-xl text-center mb-2 truncate">
              {data.name || 'Unnamed Hero'}
            </div>

            {/* RPG Class tag */}
            {data.rpgClass && (
              <div className="text-center mb-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(255,215,0,0.2)',
                    color: '#FFD700',
                    border: '1px solid rgba(255,215,0,0.4)'
                  }}
                >
                  {data.rpgClass}
                </span>
              </div>
            )}

            {/* Bio text - wraps around avatar */}
            {data.bio && (
              <div
                className="relative font-body text-sm text-gray-300 leading-relaxed"
                style={{
                  paddingRight: '3.5rem', // Space for avatar
                  marginBottom: '0.5rem'
                }}
              >
                {data.bio}
              </div>
            )}
          </div>

          {/* Avatar overlay (bottom right, higher z-index) */}
          <div
            className="absolute bottom-4 right-4 z-10 w-14 h-14 rounded-full overflow-hidden border-2 border-gold"
            style={{ boxShadow: '0 0 20px rgba(255,215,0,0.5)' }}
          >
            {data.avatarImageUrl ? (
              <Image
                src={data.avatarImageUrl}
                alt="Avatar"
                width={56}
                height={56}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
            )}
          </div>

          {/* Characteristics bar (below bio) */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3"
            style={{
              background:
                'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)'
            }}
          >
            <div className="flex justify-between text-xs font-damion text-cyan">
              {data.age && <span>{data.age} yrs</span>}
              {data.height && <span>{data.height}</span>}
              {(data.hometown || data.state) && (
                <span className="text-right">
                  {data.hometown}
                  {data.state ? `, ${data.state}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Decorative corner elements */}
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-gold/50" />
          <div className="absolute bottom-12 left-2 w-6 h-6 border-b-2 border-l-2 border-gold/50" />
        </div>
      </div>
    </div>
  );
}

// ===== API ROUTE HELPER (for server components) =====
export async function fetchUserCard(userId: string) {
  // This would call /api/quest/manifest?userId=...
  // For now, return mock structure
  return {
    userId,
    name: 'Test Hero',
    gender: 'male',
    age: 28,
    height: '6\'1"',
    hometown: 'Austin',
    state: 'TX',
    rpgClass: 'adventurer',
    membershipLevel: 'gold',
    avatarImageUrl: 'https://example.com/avatar.png',
    bio: 'Looking for someone who loves adventure and good coffee.',
    showCard: true
  };
}
