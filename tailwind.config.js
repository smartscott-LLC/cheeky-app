const { fontFamily } = require('tailwindcss/defaultTheme');
const palette = require('./styles/palette-colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        script: ['var(--font-script)', 'cursive']
      },
      // Floor palettes — source of truth: styles/palettes/*.scss, brand
      // values from the Club Cheeky UI Style Guide (docs/UI-STYLE-GUIDE.txt).
      // Full 50-950 scales: styles/tailwind_color_scales.md -> palette-colors.js.
      colors: {
        // The club neon kit — full scales + legacy sub-tokens kept so existing
        // classes (text-gold, bg-cyan, from-gold-graphite, ...) keep resolving.
        gold: {
          ...palette.gold,
          DEFAULT: '#FFD700', // primary gold (style guide)
          royal: '#FFE44D',
          graphite: '#434041',
          mocha: '#3E2E33'
        },
        cyan: {
          ...palette.cyan,
          DEFAULT: '#00F5FF' // neon cyan (style guide)
        },
        'bubblegum-fizz': palette['bubblegum-fizz'],
        'blue-violet': palette['blue-violet'],
        club: {
          DEFAULT: '#FF4DA6', // neon pink (style guide)
          pink: '#FF4DA6',
          cotton: '#FF56D5',
          indigo: '#6C089B',
          canary: '#F1F15E'
        },
        purple: {
          DEFAULT: '#2D0A4E', // deep purple (style guide)
          neon: '#9B59B6'
        },
        silver: {
          DEFAULT: '#C0C0C0' // chrome silver (style guide)
        },
        platinum: {
          DEFAULT: '#C7C7C7', // silver
          alice: '#D8EEFF',
          navy: '#310A9C',
          smoke: '#F4F3F2'
        },
        diamond: {
          DEFAULT: '#FB035C', // hot fuchsia
          raspberry: '#85054C',
          mist: '#F0FFFF',
          taupe: '#55484C',
          navy: '#1B3A6B' // diamond blue badge (style guide)
        }
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
