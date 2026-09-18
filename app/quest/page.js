'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Avatar3D from '@/components/ui/Quest/Avatar3D';

// ===== CONSTANTS =====

const SKIN_TONES = [
  { name: 'Porcelain', hex: '#FDE8CB' },
  { name: 'Fair', hex: '#F5C898' },
  { name: 'Warm', hex: '#DBA27A' },
  { name: 'Tan', hex: '#C1784A' },
  { name: 'Caramel', hex: '#9B5C34' },
  { name: 'Espresso', hex: '#6B3A22' },
  { name: 'Ebony', hex: '#3A1F0E' }
];

const HAIR_COLORS = [
  { name: 'Jet Black', hex: '#1C1209' },
  { name: 'Dark Brown', hex: '#3C2415' },
  { name: 'Auburn', hex: '#7B3F00' },
  { name: 'Chestnut', hex: '#9B4523' },
  { name: 'Golden', hex: '#DAA520' },
  { name: 'Strawberry', hex: '#E87050' },
  { name: 'Fiery Red', hex: '#CC2200' },
  { name: 'Silver', hex: '#A8A9AD' },
  { name: 'Snow White', hex: '#DEDEDE' },
  { name: 'Teal', hex: '#007B7B' },
  { name: 'Cobalt', hex: '#0040A0' },
  { name: 'Violet', hex: '#6B2FAE' },
  { name: 'Hot Pink', hex: '#E01480' },
  { name: 'Rose Gold', hex: '#B56B6B' }
];

const EYE_COLORS = [
  { name: 'Espresso', hex: '#3D2010' },
  { name: 'Warm Brown', hex: '#7B4A2D' },
  { name: 'Hazel', hex: '#7B5B38' },
  { name: 'Amber', hex: '#CC9900' },
  { name: 'Forest', hex: '#228B22' },
  { name: 'Emerald', hex: '#40A878' },
  { name: 'Ocean', hex: '#1E6B9A' },
  { name: 'Sky Blue', hex: '#5BA8CE' },
  { name: 'Steel Gray', hex: '#607080' },
  { name: 'Mystic Gold', hex: '#CFB53B' },
  { name: 'Amethyst', hex: '#9966CC' }
];

const MALE_HAIR_STYLES = [
  { id: 'short_crop', name: 'Short Crop', emoji: '✂️' },
  { id: 'fade', name: 'High Fade', emoji: '💈' },
  { id: 'curly', name: 'Curly / Afro', emoji: '🌀' },
  { id: 'waves', name: 'Waves', emoji: '〰️' },
  { id: 'mohawk', name: 'Mohawk', emoji: '⚡' },
  { id: 'bald', name: 'Bald & Bold', emoji: '✨' },
  { id: 'messy', name: 'Messy Flow', emoji: '🌪️' },
  { id: 'locs', name: 'Locs', emoji: '🌿' }
];

const FEMALE_HAIR_STYLES = [
  { id: 'long_straight', name: 'Long Straight', emoji: '📏' },
  { id: 'curly', name: 'Curly Wild', emoji: '🌀' },
  { id: 'wavy_bob', name: 'Wavy Bob', emoji: '〰️' },
  { id: 'high_ponytail', name: 'High Ponytail', emoji: '🎀' },
  { id: 'braids', name: 'Braids', emoji: '🌿' },
  { id: 'pixie', name: 'Pixie Cut', emoji: '✨' },
  { id: 'locs', name: 'Locs', emoji: '🎯' },
  { id: 'updo', name: 'Elegant Updo', emoji: '👑' }
];

const BUILDS = [
  { id: 'slim', name: 'Slim', emoji: '🌟' },
  { id: 'athletic', name: 'Athletic', emoji: '💪' },
  { id: 'average', name: 'Average', emoji: '⚖️' },
  { id: 'curvy', name: 'Curvy / Muscular', emoji: '🔥' },
  { id: 'plus', name: 'Plus Size', emoji: '💫' }
];

const OUTFITS = [
  {
    id: 'casual',
    name: 'Casual Chic',
    emoji: '👕',
    desc: 'Laid-back & stylish'
  },
  { id: 'smart', name: 'Smart Style', emoji: '👔', desc: 'Polished & refined' },
  {
    id: 'athletic',
    name: 'Sporty Vibes',
    emoji: '🏃',
    desc: 'Active & energetic'
  },
  {
    id: 'elegant',
    name: 'Elegant Noir',
    emoji: '✨',
    desc: 'Sophisticated & sleek'
  },
  {
    id: 'fantasy',
    name: 'Fantasy Quest',
    emoji: '⚔️',
    desc: 'Heroic armor & magic'
  }
];

const TOPS = [
  {
    id: 'crew_neck',
    name: 'Crew-Neck Tee',
    emoji: '👕',
    desc: 'Classic fitted tee'
  },
  {
    id: 'v_neck',
    name: 'V-Neck Shirt',
    emoji: '👔',
    desc: 'Smart casual V-neck'
  },
  {
    id: 'hoodie',
    name: 'Oversized Hoodie',
    emoji: '🧥',
    desc: 'Cozy streetwear'
  },
  {
    id: 'button_up',
    name: 'Button-Up Shirt',
    emoji: '👔',
    desc: 'Crisp collared shirt'
  },
  { id: 'tank', name: 'Sleeveless Tank', emoji: '💪', desc: 'Athletic & bold' },
  { id: 'crop', name: 'Crop Top', emoji: '✨', desc: 'Trendy & playful' },
  {
    id: 'blazer',
    name: 'Tailored Blazer',
    emoji: '🧥',
    desc: 'Sharp & authoritative'
  },
  {
    id: 'armor',
    name: 'Heroic Armor',
    emoji: '⚔️',
    desc: 'Fantasy battle gear'
  }
];

const BOTTOMS = [
  {
    id: 'jeans',
    name: 'Fitted Jeans',
    emoji: '👖',
    desc: 'Classic dark denim'
  },
  {
    id: 'chinos',
    name: 'Chino Pants',
    emoji: '👖',
    desc: 'Smart casual trousers'
  },
  {
    id: 'joggers',
    name: 'Slim Joggers',
    emoji: '👖',
    desc: 'Athletic comfort'
  },
  { id: 'skirt', name: 'Flowing Skirt', emoji: '👗', desc: 'Elegant & free' },
  {
    id: 'shorts',
    name: 'Tailored Shorts',
    emoji: '🩳',
    desc: 'Clean summer look'
  },
  {
    id: 'leggings',
    name: 'Slim Leggings',
    emoji: '👖',
    desc: 'Sleek & sporty'
  },
  {
    id: 'armor_skirt',
    name: 'Battle Skirt',
    emoji: '🛡️',
    desc: 'Fantasy warrior skirt'
  }
];

const SHOES = [
  {
    id: 'sneakers',
    name: 'White Sneakers',
    emoji: '👟',
    desc: 'Clean & classic'
  },
  {
    id: 'boots',
    name: 'Leather Boots',
    emoji: '🥾',
    desc: 'Rugged & confident'
  },
  { id: 'heels', name: 'Stiletto Heels', emoji: '👠', desc: 'Bold & elegant' },
  {
    id: 'sandals',
    name: 'Strappy Sandals',
    emoji: '🩴',
    desc: 'Relaxed & free'
  },
  {
    id: 'runners',
    name: 'Sport Runners',
    emoji: '👟',
    desc: 'Performance ready'
  },
  {
    id: 'loafers',
    name: 'Leather Loafers',
    emoji: '👞',
    desc: 'Refined & polished'
  },
  {
    id: 'combat_boots',
    name: 'Combat Boots',
    emoji: '🥾',
    desc: 'Edgy & tough'
  }
];

const ACCESSORIES_OPTIONS = [
  {
    id: 'necklace',
    name: 'Gold Necklace',
    emoji: '📿',
    desc: 'Delicate chain'
  },
  {
    id: 'earrings',
    name: 'Stud Earrings',
    emoji: '✨',
    desc: 'Simple & elegant'
  },
  {
    id: 'glasses',
    name: 'Fashion Glasses',
    emoji: '👓',
    desc: 'Stylish frames'
  },
  { id: 'watch', name: 'Luxury Watch', emoji: '⌚', desc: 'Statement piece' },
  {
    id: 'bracelet',
    name: 'Beaded Bracelet',
    emoji: '📿',
    desc: 'Bohemian touch'
  },
  {
    id: 'hat_baseball',
    name: 'Baseball Cap',
    emoji: '🧢',
    desc: 'Casual sport'
  },
  { id: 'hat_beanie', name: 'Beanie', emoji: '🧶', desc: 'Cozy & trendy' },
  { id: 'hat_beret', name: 'Beret', emoji: '🎨', desc: 'Artistic flair' },
  {
    id: 'hat_wide_brim',
    name: 'Wide-Brim Hat',
    emoji: '👒',
    desc: 'Sun-kissed glow'
  },
  { id: 'headband', name: 'Sweatband', emoji: '💪', desc: 'Athletic edge' }
];

const TATTOOS_OPTIONS = [
  { id: 'none', name: 'No Tattoos', emoji: '❌', desc: 'Clean canvas' },
  { id: 'sleeve', name: 'Arm Sleeve', emoji: '💪', desc: 'Full forearm art' },
  {
    id: 'chest',
    name: 'Chest Piece',
    emoji: '🛡️',
    desc: 'Heart-center design'
  },
  {
    id: 'shoulder',
    name: 'Shoulder Tattoo',
    emoji: '✨',
    desc: 'Classic placement'
  },
  { id: 'finger', name: 'Finger Rings', emoji: '💍', desc: 'Minimal & clever' },
  { id: 'neck', name: 'Small Neck', emoji: '🔥', desc: 'Bold & visible' },
  { id: 'hand', name: 'Hand Details', emoji: '✋', desc: 'Artistic expression' }
];

const RPG_CLASSES = [
  {
    id: 'romantic',
    name: 'The Romantic',
    emoji: '💝',
    desc: 'Your words move hearts. Charm is your weapon.',
    color: '#FF69B4'
  },
  {
    id: 'adventurer',
    name: 'The Adventurer',
    emoji: '⚔️',
    desc: 'Bold & fearless. No quest too daring.',
    color: '#FFD700'
  },
  {
    id: 'scholar',
    name: 'The Scholar',
    emoji: '📚',
    desc: 'Witty & curious. Wisdom conquers all.',
    color: '#00E5FF'
  },
  {
    id: 'mystic',
    name: 'The Mystic',
    emoji: '🔮',
    desc: 'Mysterious & intuitive. You see beyond.',
    color: '#9B59B6'
  },
  {
    id: 'champion',
    name: 'The Champion',
    emoji: '🛡️',
    desc: 'Strong & protective. Your heart shields others.',
    color: '#E74C3C'
  }
];

const DEFAULT_CONFIG = {
  gender: null,
  skinTone: 'Warm',
  hairStyle: null,
  hairColor: 'Jet Black',
  eyeColor: 'Warm Brown',
  build: 'athletic',
  outfit: 'casual',
  personality: null,
  name: '',
  // Clothing details
  top: 'stylish crew-neck tee',
  bottom: 'fitted dark jeans',
  shoes: 'clean white sneakers',
  // Accessories
  accessories: [],
  tattoos: [],
  hat: null
};

const STEPS_MANUAL = [
  'intro',
  'path',
  'gender',
  'appearance',
  'facehair',
  'style',
  'outfit',
  'accessories',
  'generating',
  'final'
];
const STEPS_AI = ['intro', 'path', 'ai', 'generating', 'final'];

// ===== HELPERS =====
const getSkinHex = (name) =>
  SKIN_TONES.find((s) => s.name === name)?.hex || '#DBA27A';
const getHairHex = (name) =>
  HAIR_COLORS.find((h) => h.name === name)?.hex || '#1C1209';
const getEyeHex = (name) =>
  EYE_COLORS.find((e) => e.name === name)?.hex || '#7B4A2D';

// eslint-disable-next-line eslint-comments/no-unused-disable
// ===== SVG AVATAR =====
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _AvatarSVG({ config }) {
  const {
    gender,
    skinTone,
    hairStyle,
    hairColor,
    eyeColor,
    outfit,
    personality
  } = config;
  const skinHex = getSkinHex(skinTone);
  const hairHex = getHairHex(hairColor);
  const eyeHex = getEyeHex(eyeColor);

  const classColors = {
    romantic: '#FF69B4',
    adventurer: '#FFD700',
    scholar: '#00E5FF',
    mystic: '#9B59B6',
    champion: '#E74C3C'
  };
  const glowColor = classColors[personality] || '#FFD700';

  const outfitPal = {
    casual: { base: '#2C4E7A', dark: '#1A3260' },
    smart: { base: '#1A2060', dark: '#0F1440', tie: '#FFD700' },
    athletic: { base: '#8B0000', dark: '#5A0000', stripe: '#FF4444' },
    elegant: { base: '#2A0E48', dark: '#180830' },
    fantasy: { base: '#0A1428', dark: '#050A14', accent: '#FFD700' }
  };
  const pal = outfitPal[outfit] || outfitPal.casual;

  const renderHairBack = () => {
    if (!hairStyle || gender !== 'female') return null;
    if (hairStyle === 'long_straight')
      return (
        <>
          <rect x="34" y="84" width="22" height="190" fill={hairHex} rx="11" />
          <rect x="144" y="84" width="22" height="190" fill={hairHex} rx="11" />
        </>
      );
    if (hairStyle === 'wavy_bob')
      return (
        <>
          <path
            d="M46 130 Q38 155 42 176 Q52 179 57 171 Q51 154 56 130Z"
            fill={hairHex}
          />
          <path
            d="M154 130 Q162 155 158 176 Q148 179 143 171 Q149 154 144 130Z"
            fill={hairHex}
          />
        </>
      );
    if (hairStyle === 'braids')
      return (
        <>
          <rect x="36" y="90" width="9" height="190" fill={hairHex} rx="4.5" />
          <rect x="52" y="88" width="9" height="192" fill={hairHex} rx="4.5" />
          <rect x="131" y="88" width="9" height="192" fill={hairHex} rx="4.5" />
          <rect x="147" y="90" width="9" height="190" fill={hairHex} rx="4.5" />
        </>
      );
    if (hairStyle === 'locs')
      return (
        <>
          <rect
            x="35"
            y="86"
            width="8"
            height="194"
            fill={hairHex}
            rx="4"
            opacity="0.8"
          />
          <rect
            x="46"
            y="84"
            width="8"
            height="196"
            fill={hairHex}
            rx="4"
            opacity="0.8"
          />
          <rect
            x="145"
            y="84"
            width="8"
            height="196"
            fill={hairHex}
            rx="4"
            opacity="0.8"
          />
          <rect
            x="156"
            y="86"
            width="8"
            height="194"
            fill={hairHex}
            rx="4"
            opacity="0.8"
          />
        </>
      );
    return null;
  };

  const renderHairFront = () => {
    const baseCap = (
      <path
        d="M47 126 Q47 73 100 71 Q153 73 153 126 Q150 100 100 98 Q50 100 47 126Z"
        fill={hairHex}
      />
    );
    if (!hairStyle)
      return (
        <path
          d="M47 126 Q47 73 100 71 Q153 73 153 126 Q150 100 100 98 Q50 100 47 126Z"
          fill="#2A1A0A"
          opacity="0.6"
        />
      );

    if (gender === 'male') {
      switch (hairStyle) {
        case 'short_crop':
          return baseCap;
        case 'fade':
          return (
            <>
              <path
                d="M55 118 Q55 75 100 73 Q145 75 145 118 Q143 98 100 96 Q57 98 55 118Z"
                fill={hairHex}
              />
              <path
                d="M47 126 Q46 140 47 154 Q52 146 56 136 Q55 129 47 126Z"
                fill={hairHex}
                opacity="0.25"
              />
              <path
                d="M153 126 Q154 140 153 154 Q148 146 144 136 Q145 129 153 126Z"
                fill={hairHex}
                opacity="0.25"
              />
            </>
          );
        case 'curly':
          return (
            <>
              <ellipse cx="100" cy="75" rx="56" ry="33" fill={hairHex} />
              <circle cx="57" cy="90" r="17" fill={hairHex} />
              <circle cx="143" cy="90" r="17" fill={hairHex} />
              <circle cx="73" cy="69" r="16" fill={hairHex} />
              <circle cx="100" cy="63" r="19" fill={hairHex} />
              <circle cx="127" cy="69" r="16" fill={hairHex} />
            </>
          );
        case 'waves':
          return (
            <>
              {baseCap}
              <path
                d="M62 87 Q79 81 96 87 Q113 93 130 87 Q143 82 150 88"
                stroke={hairHex}
                strokeWidth="4"
                fill="none"
                opacity="0.4"
                strokeLinecap="round"
              />
              <path
                d="M58 100 Q75 94 92 100 Q109 106 126 100 Q139 95 148 101"
                stroke={hairHex}
                strokeWidth="4"
                fill="none"
                opacity="0.4"
                strokeLinecap="round"
              />
            </>
          );
        case 'mohawk':
          return (
            <path
              d="M84 108 Q100 36 116 108 Q108 111 100 109 Q92 111 84 108Z"
              fill={hairHex}
            />
          );
        case 'bald':
          return (
            <ellipse
              cx="86"
              cy="88"
              rx="13"
              ry="8"
              fill="white"
              opacity="0.07"
              transform="rotate(-25,86,88)"
            />
          );
        case 'messy':
          return (
            <>
              {baseCap}
              <path d="M66 79 L61 59 L77 77" fill={hairHex} />
              <path d="M86 74 L83 53 L98 72" fill={hairHex} />
              <path d="M113 74 L117 52 L123 72" fill={hairHex} />
              <path d="M131 79 L137 60 L142 77" fill={hairHex} />
            </>
          );
        case 'locs':
          return (
            <>
              {baseCap}
              {[61, 72, 83, 94, 105, 116, 127, 138].map((x, i) => (
                <rect
                  key={i}
                  x={x - 3}
                  y="80"
                  width="6"
                  height="26"
                  fill={hairHex}
                  rx="3"
                  opacity="0.65"
                />
              ))}
            </>
          );
        default:
          return baseCap;
      }
    } else {
      switch (hairStyle) {
        case 'long_straight':
          return baseCap;
        case 'curly':
          return (
            <>
              <ellipse cx="100" cy="72" rx="63" ry="41" fill={hairHex} />
              <ellipse cx="40" cy="134" rx="22" ry="46" fill={hairHex} />
              <ellipse cx="160" cy="134" rx="22" ry="46" fill={hairHex} />
            </>
          );
        case 'wavy_bob':
          return baseCap;
        case 'high_ponytail':
          return (
            <>
              <path
                d="M50 124 Q50 77 100 75 Q150 77 150 124 Q147 101 100 99 Q53 101 50 124Z"
                fill={hairHex}
              />
              <ellipse cx="100" cy="65" rx="14" ry="10" fill={hairHex} />
              <path d="M92 64 Q100 30 108 64" fill={hairHex} />
              <path
                d="M95 64 Q100 38 105 64 Q100 34 95 64Z"
                fill={hairHex}
                opacity="0.55"
              />
            </>
          );
        case 'braids':
          return (
            <>
              {baseCap}
              {[83, 97, 111].map((x, i) => (
                <rect
                  key={i}
                  x={x - 4}
                  y="82"
                  width="8"
                  height="198"
                  fill={hairHex}
                  rx="4"
                />
              ))}
            </>
          );
        case 'pixie':
          return (
            <>
              <path
                d="M50 122 Q50 78 100 76 Q150 78 150 122 Q147 101 100 99 Q53 101 50 122Z"
                fill={hairHex}
              />
              <path d="M50 118 Q45 108 50 102 Q54 110 55 118Z" fill={hairHex} />
              <path d="M80 74 L82 61 L90 72" fill={hairHex} />
              <path d="M100 72 L102 57 L110 72" fill={hairHex} />
              <path d="M118 74 L122 60 L127 73" fill={hairHex} />
            </>
          );
        case 'locs':
          return (
            <>
              {baseCap}
              {[57, 67, 77, 87, 97, 107, 117, 127, 137, 147].map((x, i) => (
                <rect
                  key={i}
                  x={x - 3}
                  y="81"
                  width="6"
                  height="199"
                  fill={hairHex}
                  rx="3"
                  opacity="0.8"
                />
              ))}
            </>
          );
        case 'updo':
          return (
            <>
              <path
                d="M50 122 Q50 80 100 78 Q150 80 150 122 Q147 102 100 100 Q53 102 50 122Z"
                fill={hairHex}
              />
              <ellipse cx="100" cy="68" rx="26" ry="21" fill={hairHex} />
              <ellipse
                cx="100"
                cy="62"
                rx="18"
                ry="14"
                fill={hairHex}
                opacity="0.65"
              />
              <path d="M50 112 Q43 122 46 130 Q54 125 53 112Z" fill={hairHex} />
              <path
                d="M150 112 Q157 122 154 130 Q146 125 147 112Z"
                fill={hairHex}
              />
            </>
          );
        default:
          return baseCap;
      }
    }
  };

  const renderOutfit = () => (
    <>
      <path
        d="M28 280 Q22 248 54 226 Q100 214 146 226 Q178 248 172 280Z"
        fill={pal.base}
      />
      {outfit === 'casual' && (
        <path
          d="M80 226 Q100 217 120 226 L116 238 Q100 230 84 238Z"
          fill={pal.dark}
        />
      )}
      {outfit === 'smart' && (
        <>
          <path
            d="M78 226 Q100 215 122 226 L118 242 L100 234 L82 242Z"
            fill={pal.dark}
          />
          <path
            d="M97 234 Q100 240 103 234 L104 275 L96 275Z"
            fill={pal.tie || '#FFD700'}
            opacity="0.85"
          />
        </>
      )}
      {outfit === 'athletic' && (
        <>
          <path
            d="M72 226 Q100 216 128 226 L122 237 Q100 230 78 237Z"
            fill={pal.dark}
          />
          <path
            d="M54 242 L72 235"
            stroke={pal.stripe || '#FF4444'}
            strokeWidth="2"
            opacity="0.6"
          />
          <path
            d="M146 242 L128 235"
            stroke={pal.stripe || '#FF4444'}
            strokeWidth="2"
            opacity="0.6"
          />
        </>
      )}
      {outfit === 'elegant' && (
        <>
          <path
            d="M80 226 Q100 214 120 226 L110 252 L100 244 L90 252Z"
            fill={pal.dark}
          />
          <circle cx="100" cy="248" r="4" fill="#9B59B6" opacity="0.8" />
        </>
      )}
      {outfit === 'fantasy' && (
        <>
          <path
            d="M75 226 Q100 214 125 226 L120 242 L100 234 L80 242Z"
            fill={pal.dark}
          />
          <circle cx="100" cy="222" r="7" fill={pal.accent || '#FFD700'} />
          <path
            d="M85 222 L88 228 L85 234"
            stroke={pal.accent || '#FFD700'}
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M115 222 L112 228 L115 234"
            stroke={pal.accent || '#FFD700'}
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M54 232 L60 237 L54 242"
            stroke="#00E5FF"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M146 232 L140 237 L146 242"
            stroke="#00E5FF"
            strokeWidth="1.5"
            fill="none"
          />
        </>
      )}
    </>
  );

  return (
    <svg
      viewBox="0 0 200 280"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-2xl"
    >
      <defs>
        <radialGradient id="bgGlowAv" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={glowColor} stopOpacity="0.14" />
          <stop offset="100%" stopColor="#080B1A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="skinShine" cx="38%" cy="35%">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="black" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="140" rx="95" ry="130" fill="url(#bgGlowAv)" />

      {renderOutfit()}

      <rect x="87" y="186" width="26" height="42" fill={skinHex} rx="5" />

      {renderHairBack()}

      <ellipse cx="100" cy="130" rx="52" ry="56" fill={skinHex} />
      <ellipse cx="100" cy="130" rx="52" ry="56" fill="url(#skinShine)" />

      <ellipse cx="47" cy="132" rx="8" ry="11" fill={skinHex} />
      <ellipse cx="153" cy="132" rx="8" ry="11" fill={skinHex} />

      {renderHairFront()}

      <path
        d="M68 113 Q79 108 90 113"
        stroke={hairStyle === 'bald' ? '#555' : hairHex}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M110 113 Q121 108 132 113"
        stroke={hairStyle === 'bald' ? '#555' : hairHex}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx="79" cy="126" rx="13" ry="10" fill="white" />
      <ellipse cx="121" cy="126" rx="13" ry="10" fill="white" />
      <circle cx="79" cy="126" r="8" fill={eyeHex} />
      <circle cx="121" cy="126" r="8" fill={eyeHex} />
      <circle cx="80" cy="126" r="4.5" fill="#111" />
      <circle cx="122" cy="126" r="4.5" fill="#111" />
      <circle cx="82" cy="123" r="2.2" fill="white" opacity="0.9" />
      <circle cx="124" cy="123" r="2.2" fill="white" opacity="0.9" />
      <circle cx="78" cy="128" r="1" fill="white" opacity="0.5" />
      <circle cx="120" cy="128" r="1" fill="white" opacity="0.5" />

      {gender === 'female' && (
        <>
          <path
            d="M66 116 L63 111 M71 115 L69 110 M76 115 L75 110 M81 116 L81 110 M86 116 L88 111 M90 118 L93 113"
            stroke={hairHex}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M110 118 L107 113 M114 116 L112 111 M119 115 L119 110 M124 115 L125 110 M129 115 L131 110 M134 116 L137 111"
            stroke={hairHex}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse
            cx="65"
            cy="150"
            rx="13"
            ry="7"
            fill="#FF9090"
            opacity="0.18"
          />
          <ellipse
            cx="135"
            cy="150"
            rx="13"
            ry="7"
            fill="#FF9090"
            opacity="0.18"
          />
        </>
      )}

      <path
        d="M96 148 Q100 158 104 148"
        stroke="#8B6355"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="97" cy="157" r="2.5" fill="#8B6355" opacity="0.45" />
      <circle cx="103" cy="157" r="2.5" fill="#8B6355" opacity="0.45" />

      <path
        d="M85 167 Q100 179 115 167"
        stroke="#C86B5A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M88 167 Q100 163 112 167"
        stroke="#C86B5A"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />

      {personality && (
        <>
          <ellipse
            cx="100"
            cy="130"
            rx="56"
            ry="60"
            fill="none"
            stroke={glowColor}
            strokeWidth="1.5"
            opacity="0.13"
          />
          <ellipse
            cx="100"
            cy="130"
            rx="58"
            ry="62"
            fill="none"
            stroke={glowColor}
            strokeWidth="0.5"
            opacity="0.07"
          />
        </>
      )}
    </svg>
  );
}

// ===== UI PRIMITIVES =====
function ColorSwatch({ hex, name, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(name)}
      title={name}
      className="relative transition-all duration-200 rounded-full focus:outline-none"
      style={{ transform: selected ? 'scale(1.3)' : 'scale(1)' }}
    >
      <div
        className="w-9 h-9 rounded-full border-2 transition-all duration-200"
        style={{
          backgroundColor: hex,
          borderColor: selected ? 'white' : 'transparent',
          boxShadow: selected ? `0 0 12px ${hex}` : 'none'
        }}
      />
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold drop-shadow-lg">✓</span>
        </div>
      )}
    </button>
  );
}

function OptionCard({ id, name, emoji, desc, selected, onClick, color }) {
  return (
    <button
      onClick={() => onClick(id)}
      className="relative p-3 rounded-xl border-2 transition-all duration-200 text-left w-full"
      style={{
        borderColor: selected ? color || '#FFD700' : 'rgba(255,255,255,0.1)',
        backgroundColor: selected
          ? `${color || '#FFD700'}18`
          : 'rgba(255,255,255,0.03)',
        boxShadow: selected ? `0 0 20px ${color || '#FFD700'}30` : 'none'
      }}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-white text-sm font-semibold leading-tight">
        {name}
      </div>
      {desc && (
        <div className="text-gray-400 text-xs mt-0.5 leading-tight">{desc}</div>
      )}
      {selected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color || '#FFD700' }}
        >
          <span className="text-black text-xs font-bold">✓</span>
        </div>
      )}
    </button>
  );
}

function StepHeader({ title, subtitle, color = '#FFD700' }) {
  return (
    <div className="mb-6">
      <h2
        className="text-2xl font-bold mb-1 leading-tight"
        style={{ color, fontFamily: 'var(--font-fascinate)' }}
      >
        {title}
      </h2>
      <p
        className="text-gray-300"
        style={{ fontFamily: 'var(--font-damion)', fontSize: '1.1rem' }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continue →',
  nextDisabled = false,
  isLoading = false
}) {
  return (
    <div className="flex gap-3 mt-8">
      {onBack && (
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-all text-sm"
        >
          ← Back
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled || isLoading}
          className="py-3 px-6 rounded-xl font-bold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FF9500)',
            flex: 2,
            boxShadow: nextDisabled ? 'none' : '0 0 20px rgba(255,215,0,0.35)'
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">⟳</span> Generating…
            </span>
          ) : (
            nextLabel
          )}
        </button>
      )}
    </div>
  );
}

// ===== SCREENS =====
function IntroScreen({ onStart }) {
  // oxlint-disable-next-line react/set-state-in-effect
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const colors = ['#FFD700', '#00E5FF', '#FF00FF'];
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        size: Math.random() * 3 + 1,
        color: colors[i % 3],
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
        opacity: Math.random() * 0.7 + 0.2
      }))
    );
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full animate-pulse"
            style={{
              width: p.size + 'px',
              height: p.size + 'px',
              backgroundColor: p.color,
              left: p.left + '%',
              top: p.top + '%',
              animationDelay: p.delay + 's',
              animationDuration: p.duration + 's',
              opacity: p.opacity
            }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10"
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl mb-6"
        >
          💫
        </motion.div>
        <div
          className="mb-2 text-sm tracking-widest uppercase"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1.2rem'
          }}
        >
          Begin Your
        </div>
        <h1
          className="text-5xl md:text-6xl font-black mb-3 leading-tight"
          style={{
            color: '#FFD700',
            fontFamily: 'var(--font-fascinate)',
            textShadow: '0 0 40px rgba(255,215,0,0.5)'
          }}
        >
          Quest for Love
        </h1>
        <p
          className="text-xl mb-2"
          style={{
            color: '#FF00FF',
            fontFamily: 'var(--font-rancho)',
            textShadow: '0 0 20px rgba(255,0,255,0.4)',
            fontSize: '1.4rem'
          }}
        >
          Avatar Creator
        </p>
        <p className="text-gray-400 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
          Forge your legendary hero with Pixar-quality AI portraiture. Every
          epic romance starts with a single moment of creation.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="px-10 py-4 rounded-2xl text-black font-black text-lg tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FF9500)',
            boxShadow:
              '0 0 40px rgba(255,165,0,0.5), 0 4px 20px rgba(0,0,0,0.4)',
            fontFamily: 'var(--font-fascinate)'
          }}
        >
          ⚔️ Begin My Quest
        </motion.button>
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-600">
          <span>✨ AI Portrait</span>
          <span>🎮 RPG Classes</span>
          <span>💾 Save to Account</span>
        </div>
      </motion.div>
    </div>
  );
}

function PathSelector({ onSelectPath, onBack }) {
  return (
    <div className="flex flex-col">
      <StepHeader
        title="How Shall We Begin?"
        subtitle="Choose the path to forge your legend…"
        color="#FFD700"
      />
      <div className="grid grid-cols-1 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectPath('manual')}
          className="p-6 rounded-2xl border-2 text-left transition-all"
          style={{
            borderColor: 'rgba(255,215,0,0.3)',
            backgroundColor: 'rgba(255,215,0,0.05)',
            boxShadow: '0 0 20px rgba(255,215,0,0.08)'
          }}
        >
          <div className="text-4xl mb-3">⚙️</div>
          <div
            className="text-xl font-bold text-[#FFD700] mb-2"
            style={{ fontFamily: 'var(--font-fascinate)' }}
          >
            Craft It Yourself
          </div>
          <div
            className="text-gray-300 text-sm mb-3"
            style={{ fontFamily: 'var(--font-damion)', fontSize: '1rem' }}
          >
            Handpick every detail — hair, eyes, style & class. An avatar truly
            yours.
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              '👤 Gender',
              '🎨 Skin & Build',
              '💇 Hair & Eyes',
              '👔 Style & Class'
            ].map((t) => (
              <span
                key={t}
                className="text-xs bg-[rgba(255,215,0,0.1)] text-[#FFD700] px-2 py-1 rounded-full border border-[rgba(255,215,0,0.2)]"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectPath('ai')}
          className="p-6 rounded-2xl border-2 text-left transition-all"
          style={{
            borderColor: 'rgba(0,229,255,0.3)',
            backgroundColor: 'rgba(0,229,255,0.05)',
            boxShadow: '0 0 20px rgba(0,229,255,0.08)'
          }}
        >
          <div className="text-4xl mb-3">✨</div>
          <div
            className="text-xl font-bold text-[#00E5FF] mb-2"
            style={{ fontFamily: 'var(--font-fascinate)' }}
          >
            Let AI Divine It
          </div>
          <div
            className="text-gray-300 text-sm mb-3"
            style={{ fontFamily: 'var(--font-damion)', fontSize: '1rem' }}
          >
            Describe yourself or upload a photo. Our Oracle weaves your Pixar
            portrait.
          </div>
          <div className="flex gap-2 flex-wrap">
            {['📸 Upload Photo', '💬 Describe Yourself', '🎨 AI Portrait'].map(
              (t) => (
                <span
                  key={t}
                  className="text-xs bg-[rgba(0,229,255,0.1)] text-[#00E5FF] px-2 py-1 rounded-full border border-[rgba(0,229,255,0.2)]"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </motion.button>
      </div>
      <NavButtons onBack={onBack} onNext={null} />
    </div>
  );
}

function GenderStep({ config, onUpdate, onNext, onBack }) {
  return (
    <div className="flex flex-col">
      <StepHeader
        title="Who Walks This Quest?"
        subtitle="Choose your hero's identity…"
        color="#FFD700"
      />
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'male', name: 'Male', emoji: '♂️' },
          { id: 'female', name: 'Female', emoji: '♀️' }
        ].map((g) => (
          <motion.button
            key={g.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onUpdate({ gender: g.id })}
            className="p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3"
            style={{
              borderColor:
                config.gender === g.id ? '#FFD700' : 'rgba(255,255,255,0.1)',
              backgroundColor:
                config.gender === g.id
                  ? 'rgba(255,215,0,0.1)'
                  : 'rgba(255,255,255,0.02)',
              boxShadow:
                config.gender === g.id
                  ? '0 0 25px rgba(255,215,0,0.25)'
                  : 'none'
            }}
          >
            <span className="text-5xl">{g.emoji}</span>
            <span
              className="text-white font-bold text-lg"
              style={{ fontFamily: 'var(--font-fascinate)' }}
            >
              {g.name}
            </span>
            {config.gender === g.id && (
              <span className="text-[#FFD700] text-sm font-bold">
                Selected ✓
              </span>
            )}
          </motion.button>
        ))}
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!config.gender}
      />
    </div>
  );
}

function AppearanceStep({ config, onUpdate, onNext, onBack }) {
  return (
    <div className="flex flex-col">
      <StepHeader
        title="Your Physical Form"
        subtitle="Skin tone and body build…"
        color="#FFD700"
      />
      <div className="mb-6">
        <h3
          className="text-sm font-bold mb-3 tracking-widest uppercase"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Skin Tone
        </h3>
        <div className="flex flex-wrap gap-3">
          {SKIN_TONES.map((s) => (
            <ColorSwatch
              key={s.name}
              hex={s.hex}
              name={s.name}
              selected={config.skinTone === s.name}
              onClick={(name) => onUpdate({ skinTone: name })}
            />
          ))}
        </div>
        {config.skinTone && (
          <p className="mt-2 text-xs text-gray-400">{config.skinTone}</p>
        )}
      </div>
      <div className="mb-4">
        <h3
          className="text-sm font-bold mb-3 tracking-widest uppercase"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Body Build
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {BUILDS.map((b) => (
            <OptionCard
              key={b.id}
              id={b.id}
              name={b.name}
              emoji={b.emoji}
              selected={config.build === b.id}
              onClick={(id) => onUpdate({ build: id })}
              color="#FFD700"
            />
          ))}
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function FaceHairStep({ config, onUpdate, onNext, onBack }) {
  const hairStyles =
    config.gender === 'male' ? MALE_HAIR_STYLES : FEMALE_HAIR_STYLES;
  return (
    <div className="flex flex-col">
      <StepHeader
        title="Face & Hair"
        subtitle="Express your look with every detail…"
        color="#00E5FF"
      />
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FF00FF',
            fontFamily: 'var(--font-rancho)',
            fontSize: '1rem'
          }}
        >
          Hair Style
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {hairStyles.map((h) => (
            <OptionCard
              key={h.id}
              id={h.id}
              name={h.name}
              emoji={h.emoji}
              selected={config.hairStyle === h.id}
              onClick={(id) => onUpdate({ hairStyle: id })}
              color="#FF00FF"
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FF00FF',
            fontFamily: 'var(--font-rancho)',
            fontSize: '1rem'
          }}
        >
          Hair Color
        </h3>
        <div className="flex flex-wrap gap-3">
          {HAIR_COLORS.map((h) => (
            <ColorSwatch
              key={h.name}
              hex={h.hex}
              name={h.name}
              selected={config.hairColor === h.name}
              onClick={(name) => onUpdate({ hairColor: name })}
            />
          ))}
        </div>
      </div>
      <div className="mb-4">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FF00FF',
            fontFamily: 'var(--font-rancho)',
            fontSize: '1rem'
          }}
        >
          Eye Color
        </h3>
        <div className="flex flex-wrap gap-3">
          {EYE_COLORS.map((e) => (
            <ColorSwatch
              key={e.name}
              hex={e.hex}
              name={e.name}
              selected={config.eyeColor === e.name}
              onClick={(name) => onUpdate({ eyeColor: name })}
            />
          ))}
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StyleStep({ config, onUpdate, onBack, onGenerate, isGenerating }) {
  return (
    <div className="flex flex-col">
      <StepHeader
        title="Style & Quest Class"
        subtitle="Who are you in the game of love?"
        color="#FF00FF"
      />
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FFD700',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Outfit
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {OUTFITS.map((o) => (
            <OptionCard
              key={o.id}
              id={o.id}
              name={o.name}
              emoji={o.emoji}
              desc={o.desc}
              selected={config.outfit === o.id}
              onClick={(id) => onUpdate({ outfit: id })}
              color="#FFD700"
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FFD700',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Quest Class
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {RPG_CLASSES.map((c) => (
            <OptionCard
              key={c.id}
              id={c.id}
              name={c.name}
              emoji={c.emoji}
              desc={c.desc}
              selected={config.personality === c.id}
              onClick={(id) => onUpdate({ personality: id })}
              color={c.color}
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FFD700',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Character Name
        </h3>
        <input
          type="text"
          value={config.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Enter your hero's name…"
          maxLength={30}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-colors"
        />
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onGenerate}
        nextLabel="✨ Generate My Portrait"
        isLoading={isGenerating}
      />
    </div>
  );
}

function AIInputStep({ onGenerate, onBack, isGenerating }) {
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [name, setName] = useState('');
  const [rpgClass, setRpgClass] = useState(null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col">
      <StepHeader
        title="The Oracle Awaits"
        subtitle="Describe yourself and watch magic happen…"
        color="#00E5FF"
      />
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-2 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Describe Yourself
        </h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g.: Tall woman with natural curly hair, warm brown skin, bright green eyes, adventurous spirit, bohemian style…"
          rows={4}
          maxLength={500}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00E5FF] transition-colors resize-none text-sm"
        />
        <p className="text-right text-xs text-gray-500 mt-1">
          {description.length}/500
        </p>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-2 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Reference Photo{' '}
          <span className="text-gray-500 font-normal normal-case text-xs ml-1">
            (optional)
          </span>
        </h3>
        {photoPreview ? (
          <div className="relative">
            {/* oxlint-disable-next-line next/no-img-element */}
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full max-w-xs rounded-xl border border-[#00E5FF]/30 object-cover"
              style={{ maxHeight: '180px' }}
            />
            <button
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
              }}
              className="absolute top-2 right-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded-lg"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-6 rounded-xl border-2 border-dashed border-[rgba(0,229,255,0.3)] hover:border-[#00E5FF] text-gray-400 hover:text-[#00E5FF] transition-all text-center"
          >
            <div className="text-3xl mb-2">📸</div>
            <div className="text-sm">Click to upload a photo</div>
            <div className="text-xs text-gray-600 mt-1">
              JPEG, PNG, WebP · Max 8MB
            </div>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-2 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Quest Class
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {RPG_CLASSES.map((c) => (
            <OptionCard
              key={c.id}
              id={c.id}
              name={c.name}
              emoji={c.emoji}
              desc={c.desc}
              selected={rpgClass === c.id}
              onClick={setRpgClass}
              color={c.color}
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-2 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Character Name
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your hero's name…"
          maxLength={30}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00E5FF] transition-colors"
        />
      </div>
      <NavButtons
        onBack={onBack}
        onNext={() =>
          onGenerate({ description, photo, name, rpgClass, type: 'ai' })
        }
        nextLabel="✨ Generate My Portrait"
        nextDisabled={description.trim().length < 10}
        isLoading={isGenerating}
      />
    </div>
  );
}

function OutfitStep({ config, onUpdate, onBack, onNext }) {
  return (
    <div className="flex flex-col">
      <StepHeader
        title="Dress Your Hero"
        subtitle="Every detail tells your story…"
        color="#FF00FF"
      />
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Top
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOPS.map((t) => (
            <OptionCard
              key={t.id}
              id={t.id}
              name={t.name}
              emoji={t.emoji}
              desc={t.desc}
              selected={config.top === t.id}
              onClick={(id) => onUpdate({ top: id })}
              color="#00E5FF"
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Bottom
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BOTTOMS.map((b) => (
            <OptionCard
              key={b.id}
              id={b.id}
              name={b.name}
              emoji={b.emoji}
              desc={b.desc}
              selected={config.bottom === b.id}
              onClick={(id) => onUpdate({ bottom: id })}
              color="#00E5FF"
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#00E5FF',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Shoes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SHOES.map((s) => (
            <OptionCard
              key={s.id}
              id={s.id}
              name={s.name}
              emoji={s.emoji}
              desc={s.desc}
              selected={config.shoes === s.id}
              onClick={(id) => onUpdate({ shoes: id })}
              color="#00E5FF"
            />
          ))}
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function AccessoriesStep({ config, onUpdate, onBack, onNext }) {
  const toggleAccessory = (id) => {
    const current = config.accessories || [];
    const next = current.includes(id)
      ? current.filter((a) => a !== id)
      : [...current, id];
    onUpdate({ accessories: next });
  };
  const toggleTattoo = (id) => {
    onUpdate({ tattoos: id === 'none' ? [] : [id] });
  };
  return (
    <div className="flex flex-col">
      <StepHeader
        title="Accessories & Details"
        subtitle="The finishing touches that make you unique…"
        color="#FF00FF"
      />
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FFD700',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Accessories{' '}
          <span className="text-gray-500 font-normal normal-case text-xs ml-1">
            (pick multiple)
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACCESSORIES_OPTIONS.map((a) => (
            <OptionCard
              key={a.id}
              id={a.id}
              name={a.name}
              emoji={a.emoji}
              desc={a.desc}
              selected={(config.accessories || []).includes(a.id)}
              onClick={() => toggleAccessory(a.id)}
              color={a.id.startsWith('hat') ? '#9B59B6' : '#FFD700'}
            />
          ))}
        </div>
      </div>
      <div className="mb-5">
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-widest"
          style={{
            color: '#FFD700',
            fontFamily: 'var(--font-damion)',
            fontSize: '1rem'
          }}
        >
          Tattoos{' '}
          <span className="text-gray-500 font-normal normal-case text-xs ml-1">
            (pick one)
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TATTOOS_OPTIONS.map((t) => (
            <OptionCard
              key={t.id}
              id={t.id}
              name={t.name}
              emoji={t.emoji}
              desc={t.desc}
              selected={
                (config.tattoos || []).includes(t.id) ||
                (!config.tattoos?.length && t.id === 'none')
              }
              onClick={() => toggleTattoo(t.id)}
              color="#E74C3C"
            />
          ))}
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function GeneratingScreen({ step, queueStatus }) {
  const messages = {
    generating: [
      'The Oracle is weaving your destiny…',
      'Channeling ancient magic…',
      'Crafting your heroic visage…',
      'Applying Pixar-quality finishing touches…',
      'Almost ready for your grand reveal…'
    ],
    animating: [
      'Bringing your hero to life…',
      'Capturing every angle…',
      'Sculpting the perfect spin…',
      'Adding depth and motion…',
      'Your legend takes form…'
    ]
  };
  const msgList = messages[step] || messages.generating;
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setMsgIdx((p) => (p + 1) % msgList.length),
      3000
    );
    return () => clearInterval(t);
  }, [msgList]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="relative w-32 h-32 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{
              borderColor: ['#FFD700', '#00E5FF', '#FF00FF'][i],
              borderTopColor: 'transparent',
              animationDuration: 2 + i * 0.5 + 's',
              transform: `scale(${1 + i * 0.2})`,
              opacity: 0.7 - i * 0.15
            }}
          />
        ))}
      </div>
      <h2
        className="text-2xl font-bold mb-3"
        style={{ color: '#FFD700', fontFamily: 'var(--font-fascinate)' }}
      >
        {step === 'animating' ? 'Animating Your Hero' : 'Forging Your Portrait'}
      </h2>
      <p
        className="text-gray-400 text-sm animate-pulse"
        style={{ fontFamily: 'var(--font-damion)', fontSize: '1.1rem' }}
      >
        {msgList[msgIdx]}
      </p>
      {queueStatus && (
        <p
          className="mt-4 text-amber-400 text-xs font-damion"
          style={{ fontFamily: 'var(--font-damion)' }}
        >
          ⏳ {queueStatus}
        </p>
      )}
    </div>
  );
}

function FinalReviewScreen({
  config,
  imageUrl,
  videoUrl,
  rpgClassOverride,
  nameOverride,
  onSave,
  onRegenerate,
  isSaving,
  savedId,
  onReset
}) {
  const resolvedClass = rpgClassOverride || config.personality;
  const resolvedName = nameOverride || config.name;
  const classInfo = RPG_CLASSES.find((c) => c.id === resolvedClass);

  if (savedId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-8"
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2
          className="text-3xl font-bold mb-2"
          style={{ color: '#FFD700', fontFamily: 'var(--font-fascinate)' }}
        >
          Avatar Forged!
        </h2>
        <p
          className="text-[#00E5FF] mb-3"
          style={{ fontFamily: 'var(--font-damion)', fontSize: '1.2rem' }}
        >
          {resolvedName || 'Your Hero'} is ready for their quest
        </p>
        {classInfo && (
          <div
            className="px-4 py-2 rounded-full text-sm font-bold mb-5"
            style={{
              backgroundColor: `${classInfo.color}20`,
              color: classInfo.color,
              border: `1px solid ${classInfo.color}40`
            }}
          >
            {classInfo.emoji} {classInfo.name}
          </div>
        )}
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-52 h-52 rounded-2xl object-cover mb-2 border-2 border-[#FFD700]/50"
            style={{ boxShadow: '0 0 30px rgba(255,215,0,0.3)' }}
          />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt="Your avatar"
            width={208}
            height={208}
            className="rounded-2xl object-cover mb-4 border-2 border-[#FFD700]/50"
            style={{ boxShadow: '0 0 30px rgba(255,215,0,0.3)' }}
          />
        ) : null}
        <p className="text-gray-600 text-xs mb-6">
          Avatar saved · ID: {savedId}
        </p>
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-all text-sm"
        >
          🔄 Create Another Hero
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col">
      <StepHeader
        title="Your Hero Awaits"
        subtitle="Behold your Pixar-quality portrait…"
        color="#FFD700"
      />
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="mb-6"
        >
          <div className="relative max-w-sm mx-auto">
            {videoUrl ? (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full rounded-2xl"
                style={{
                  boxShadow:
                    '0 0 50px rgba(255,215,0,0.3), 0 20px 40px rgba(0,0,0,0.5)'
                }}
              />
            ) : (
              <Image
                src={imageUrl}
                alt="Generated avatar"
                width={208}
                height={208}
                className="rounded-2xl"
                style={{
                  boxShadow:
                    '0 0 50px rgba(255,215,0,0.3), 0 20px 40px rgba(0,0,0,0.5)'
                }}
              />
            )}
            {classInfo && (
              <div
                className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: `${classInfo.color}dd`,
                  color: 'white',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {classInfo.emoji} {classInfo.name}
              </div>
            )}
          </div>
          {resolvedName && (
            <div className="text-center mt-3">
              <h3
                className="text-xl font-bold"
                style={{
                  color: '#FFD700',
                  fontFamily: 'var(--font-fascinate)'
                }}
              >
                {resolvedName}
              </h3>
            </div>
          )}
          {videoUrl && (
            <p className="text-center text-xs text-gray-500 mt-2">
              ✨ 360° Animated — drag to rotate
            </p>
          )}
        </motion.div>
      )}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onRegenerate}
          className="flex-1 py-3 rounded-xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-all text-sm min-w-32.5"
        >
          🔄 Regenerate
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 py-3 px-6 rounded-xl font-bold text-black transition-all disabled:opacity-50 min-w-32.5"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FF9500)',
            boxShadow: '0 0 20px rgba(255,215,0,0.4)'
          }}
        >
          {isSaving ? '⟳ Saving…' : '💾 Save to Account'}
        </button>
      </div>
    </div>
  );
}

// Compress a data URL image to JPEG via canvas to keep saved docs small
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _compressImage(dataUrl, maxBytes = 500_000) {
  return new Promise((resolve, _reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const ratio = Math.min(
        1024 / img.naturalWidth,
        1024 / img.naturalHeight,
        1
      );
      c.width = Math.round(img.naturalWidth * ratio);
      c.height = Math.round(img.naturalHeight * ratio);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      let q = 0.85;
      let result = c.toDataURL('image/jpeg', q);
      while (result.length > maxBytes && q > 0.3) {
        q -= 0.05;
        result = c.toDataURL('image/jpeg', q);
      }
      resolve(result);
    };
    img.onerror = () => resolve(dataUrl); // fall through on failure
    img.src = dataUrl;
  });
}

// ===== MAIN APP =====
export default function App() {
  const [stepName, setStepName] = useState('intro');
  const [path, setPath] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [aiGenData, setAiGenData] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [showRetry, setShowRetry] = useState(false);

  const updateConfig = useCallback(
    (updates) => setConfig((p) => ({ ...p, ...updates })),
    []
  );

  const steps = path === 'ai' ? STEPS_AI : STEPS_MANUAL;

  const goNext = useCallback(() => {
    const idx = steps.indexOf(stepName);
    if (idx < steps.length - 1) setStepName(steps[idx + 1]);
  }, [stepName, steps]);

  const goBack = useCallback(() => {
    const idx = steps.indexOf(stepName);
    if (idx > 0) setStepName(steps[idx - 1]);
  }, [stepName, steps]);

  const generatePortrait = useCallback(
    async (aiData = null) => {
      setIsGenerating(true);
      setError(null);
      setQueueStatus(null);
      setStepName('generating');

      // Retry helper for queue-full errors
      const fetchWithRetry = async (url, options, maxRetries = 5) => {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
          try {
            const res = await fetch(url, options);
            if (res.ok) return res;
            const errText = await res.text().catch(() => '');
            // Queue-full error — retry with 10s flat backoff
            if (
              res.status === 503 &&
              (errText.includes('queue') || errText.includes('full'))
            ) {
              lastError = new Error(errText.slice(0, 200));
              const delay = 10000; // 10s flat retry
              console.log(
                `[Quest] Queue full, retry ${i + 1}/${maxRetries} in ${delay}ms`
              );
              setQueueStatus(`Queue busy, waiting... (${i + 1}/${maxRetries})`);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            throw new Error(errText.slice(0, 300));
          } catch (err) {
            lastError = err;
            if (!err.message?.includes('queue') || i === maxRetries - 1)
              throw err;
            const delay = 10000; // 10s flat retry
            console.log(
              `[Quest] Queue full, retry ${i + 1}/${maxRetries} in ${delay}ms`
            );
            setQueueStatus(`Queue busy, waiting... (${i + 1}/${maxRetries})`);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
        throw lastError;
      };

      try {
        let body, headers;
        if (aiData) {
          setAiGenData(aiData);
          const fd = new FormData();
          fd.append('type', 'ai');
          fd.append('description', aiData.description || '');
          if (aiData.photo) fd.append('photo', aiData.photo);
          body = fd;
        } else {
          body = JSON.stringify({ config });
          headers = { 'Content-Type': 'application/json' };
        }
        const res = await fetchWithRetry('/api/quest/generate', {
          method: 'POST',
          headers,
          body
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.message || data.error || 'Generation failed');
        setGeneratedImage(data.imageUrl);
        setQueueStatus(null); // Clear queue message on success

        // Auto-generate video animation from approved image
        setStepName('animating');
        try {
          const videoRes = await fetchWithRetry('/api/quest/animate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: data.imageUrl,
              duration: 4,
              resolution: '720p'
            })
          });
          const videoData = await videoRes.json();
          if (videoRes.ok && videoData.videoUrl) {
            setGeneratedVideo(videoData.videoUrl);
          }
        } catch (videoErr) {
          console.warn('Video generation skipped:', videoErr.message);
        }

        setStepName('final');
      } catch (err) {
        console.error('Generation error:', err);
        setQueueStatus(null);
        // If queue full after all retries, offer retry instead of error
        if (
          err.message?.includes('queue') ||
          err.message?.includes('exhausted')
        ) {
          setShowRetry(true);
          setError(null);
        } else {
          setError(err.message);
        }
        setStepName(path === 'ai' ? 'ai' : 'style');
      } finally {
        setIsGenerating(false);
      }
    },
    [config, path]
  );

  const saveAvatar = useCallback(async () => {
    setIsSaving(true);
    try {
      const name = aiGenData?.name || config.name;
      const rpgClass = aiGenData?.rpgClass || config.personality;
      // Get userId from localStorage if authenticated
      let userId = null;
      try {
        const weave = localStorage.getItem('cheeky-weave');
        if (weave) {
          const weaveData = JSON.parse(weave);
          userId = weaveData.state?.userId || null;
        }
      } catch {}
      const res = await fetch('/api/quest/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          imageUrl: generatedImage,
          name: name || 'Unnamed Hero',
          rpgClass: rpgClass || 'adventurer',
          generationType: path,
          userId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedId(data.id);
      // Update HUD store with new avatar
      try {
        const { setAvatar } = useQuestStore.getState();
        setAvatar({
          id: data.id,
          imageUrl: generatedImage,
          name: name || 'Unnamed Hero',
          rpgClass: rpgClass || 'adventurer'
        });
      } catch {}
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [config, generatedImage, path, aiGenData]);

  const handleRegenerate = useCallback(() => {
    setGeneratedImage(null);
    setSavedId(null);
    setError(null);
    setStepName(path === 'ai' ? 'ai' : 'style');
  }, [path]);

  const handleReset = useCallback(() => {
    setStepName('intro');
    setPath(null);
    setConfig(DEFAULT_CONFIG);
    setAiGenData(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setSavedId(null);
    setError(null);
  }, []);

  const wizardSteps =
    path === 'ai'
      ? ['path', 'ai']
      : [
          'path',
          'gender',
          'appearance',
          'facehair',
          'style',
          'outfit',
          'accessories'
        ];
  const wizardIdx = wizardSteps.indexOf(stepName);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#080B1A' }}
    >
      {/* BG orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: '#FFD700' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: '#00E5FF' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-5 blur-3xl"
          style={{ backgroundColor: '#FF00FF' }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Wizard content */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {wizardIdx >= 0 && (
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex gap-1.5">
                {wizardSteps.map((s, i) => (
                  <div
                    key={s}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width:
                        i < wizardIdx
                          ? '32px'
                          : i === wizardIdx
                            ? '48px'
                            : '16px',
                      backgroundColor:
                        i <= wizardIdx ? '#FFD700' : 'rgba(255,255,255,0.15)'
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Start Over
              </button>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <div>
                <p className="font-bold text-red-400">Generation failed</p>
                <p className="text-xs mt-0.5 text-red-300/70">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs underline mt-1 hover:text-red-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {showRetry && (
            <div className="mx-4 mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
              <p className="font-bold mb-2">⏳ Queue still busy</p>
              <p className="text-xs text-amber-300/70 mb-3">
                The AI queue is currently full. Try again when it clears.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRetry(false);
                    void generatePortrait();
                  }}
                  className="flex-1 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-damion transition-colors"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={() => setShowRetry(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={stepName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {stepName === 'intro' && (
                  <IntroScreen onStart={() => setStepName('path')} />
                )}
                {stepName === 'path' && (
                  <PathSelector
                    onSelectPath={(p) => {
                      setPath(p);
                      setStepName(p === 'ai' ? 'ai' : 'gender');
                    }}
                    onBack={() => setStepName('intro')}
                  />
                )}
                {stepName === 'gender' && (
                  <GenderStep
                    config={config}
                    onUpdate={updateConfig}
                    onNext={goNext}
                    onBack={goBack}
                  />
                )}
                {stepName === 'appearance' && (
                  <AppearanceStep
                    config={config}
                    onUpdate={updateConfig}
                    onNext={goNext}
                    onBack={goBack}
                  />
                )}
                {stepName === 'facehair' && (
                  <FaceHairStep
                    config={config}
                    onUpdate={updateConfig}
                    onNext={goNext}
                    onBack={goBack}
                  />
                )}
                {stepName === 'style' && (
                  <StyleStep
                    config={config}
                    onUpdate={updateConfig}
                    onBack={goBack}
                    onGenerate={() => generatePortrait()}
                    isGenerating={isGenerating}
                  />
                )}
                {stepName === 'outfit' && (
                  <OutfitStep
                    config={config}
                    onUpdate={updateConfig}
                    onBack={goBack}
                    onNext={goNext}
                  />
                )}
                {stepName === 'accessories' && (
                  <AccessoriesStep
                    config={config}
                    onUpdate={updateConfig}
                    onBack={goBack}
                    onNext={goNext}
                  />
                )}
                {stepName === 'ai' && (
                  <AIInputStep
                    onGenerate={generatePortrait}
                    onBack={goBack}
                    isGenerating={isGenerating}
                  />
                )}
                {stepName === 'generating' && (
                  <GeneratingScreen
                    step="generating"
                    queueStatus={queueStatus}
                  />
                )}
                {stepName === 'animating' && (
                  <GeneratingScreen
                    step="animating"
                    queueStatus={queueStatus}
                  />
                )}
                {stepName === 'final' && (
                  <FinalReviewScreen
                    config={config}
                    imageUrl={generatedImage}
                    videoUrl={generatedVideo}
                    rpgClassOverride={aiGenData?.rpgClass}
                    nameOverride={aiGenData?.name}
                    onSave={saveAvatar}
                    onRegenerate={handleRegenerate}
                    isSaving={isSaving}
                    savedId={savedId}
                    onReset={handleReset}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right preview panel — desktop only */}
        {!['intro', 'generating'].includes(stepName) && (
          <div className="hidden lg:flex w-80 xl:w-96 flex-col items-center justify-center p-8 sticky top-0 h-screen border-l border-white/5">
            <div className="w-full max-w-xs">
              <div
                className="p-4 rounded-2xl mb-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)'
                }}
              >
                <div
                  className="text-xs text-center mb-3 tracking-widest uppercase"
                  style={{
                    color: '#00E5FF',
                    fontFamily: 'var(--font-damion)',
                    fontSize: '0.85rem'
                  }}
                >
                  Live Preview
                </div>
                {stepName === 'final' && generatedVideo ? (
                  <video
                    src={generatedVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full rounded-xl"
                    style={{ boxShadow: '0 0 30px rgba(255,215,0,0.25)' }}
                  />
                ) : stepName === 'final' && generatedImage ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Image
                      src={generatedImage}
                      alt="Generated"
                      width={256}
                      height={256}
                      className="w-full rounded-xl"
                      style={{ boxShadow: '0 0 30px rgba(255,215,0,0.25)' }}
                    />
                  </motion.div>
                ) : (
                  <Avatar3D
                    config={config}
                    isGenerating={isGenerating}
                    className="w-full aspect-square"
                  />
                )}
              </div>
              <div className="space-y-1">
                {config.gender && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Gender</span>
                    <span className="text-[#FFD700] capitalize">
                      {config.gender}
                    </span>
                  </div>
                )}
                {config.skinTone && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Skin</span>
                    <span className="text-white">{config.skinTone}</span>
                  </div>
                )}
                {config.hairStyle && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Hair</span>
                    <span className="text-white capitalize">
                      {config.hairStyle.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {config.top && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Top</span>
                    <span className="text-white text-right truncate ml-2">
                      {config.top}
                    </span>
                  </div>
                )}
                {config.bottom && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Bottom</span>
                    <span className="text-white text-right truncate ml-2">
                      {config.bottom}
                    </span>
                  </div>
                )}
                {config.shoes && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Shoes</span>
                    <span className="text-white text-right truncate ml-2">
                      {config.shoes}
                    </span>
                  </div>
                )}
                {(config.accessories?.length || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Gear</span>
                    <span className="text-[#FF00FF] text-right truncate ml-2">
                      {config.accessories.join(', ')}
                    </span>
                  </div>
                )}
                {config.personality && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Class</span>
                    <span
                      style={{
                        color:
                          RPG_CLASSES.find((c) => c.id === config.personality)
                            ?.color || '#FFD700'
                      }}
                    >
                      {
                        RPG_CLASSES.find((c) => c.id === config.personality)
                          ?.name
                      }
                    </span>
                  </div>
                )}
                {config.name && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Name</span>
                    <span className="text-[#FF00FF] truncate ml-2">
                      {config.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
