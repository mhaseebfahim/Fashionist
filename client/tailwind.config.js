/** Fashionist brand theme — every colour comes from CSS tokens in src/styles/tokens.css */
const t = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      ink: t('ink'),
      ivory: t('ivory'),
      sand: t('sand'),
      stone: t('stone'),
      hairline: t('hairline'),
      rose: { DEFAULT: t('rose'), deep: t('rose-deep') },
      blush: t('blush'),
      gold: t('gold'),
      // semantic surface tokens (swap in dark mode)
      bg: t('bg'),
      fg: t('fg'),
      surface: t('surface'),
      line: t('line'),
      muted: t('muted'),
    },
    fontFamily: {
      display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      sans: ['Manrope', 'system-ui', 'sans-serif'],
      urdu: ['"Noto Nastaliq Urdu"', 'serif'],
    },
    borderRadius: { none: '0', sm: '2px', DEFAULT: '2px', full: '9999px' },
    extend: {
      maxWidth: { site: '1440px' },
      letterSpacing: { label: '0.2em', brand: '0.32em' },
      fontSize: { hero: ['clamp(3.25rem, 8vw, 7.5rem)', { lineHeight: '0.95' }] },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        kenburns: { from: { transform: 'scale(1)' }, to: { transform: 'scale(1.12)' } },
        progress: { from: { width: '0%' }, to: { width: '100%' } },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        kenburns: 'kenburns 9s ease-out forwards',
        progress: 'progress 7s linear forwards',
      },
    },
  },
  plugins: [],
};
