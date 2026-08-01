const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}'
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
        sans: ['var(--font-sans)', ...fontFamily.sans]
      },
      // Floor palettes — source of truth: styles/palettes/*.scss
      colors: {
        club: {
          DEFAULT: '#F605BA', // shocking pink
          pink: '#F605BA',
          cotton: '#FF56D5',
          indigo: '#6C089B',
          canary: '#F1F15E'
        },
        gold: {
          DEFAULT: '#D29436', // harvest gold
          royal: '#E9CD42',
          graphite: '#434041',
          mocha: '#3E2E33'
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
          taupe: '#55484C'
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
