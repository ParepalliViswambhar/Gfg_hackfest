/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nykaa: {
          pink:  '#FC2779',
          light: '#FF6BAE',
          dark:  '#C4124E',
          glow:  'rgba(252,39,121,0.35)',
        },
        dark: {
          bg:     '#080B12',
          card:   '#0F1320',
          deeper: '#080B12',
          panel:  '#0C0F1C',
          border: 'rgba(255,255,255,0.07)',
          hover:  'rgba(255,255,255,0.05)',
          mid:    '#161B2E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'fade-up':      'fade-up 0.38s cubic-bezier(0.22,1,0.36,1)',
        'fade-in':      'fade-in 0.22s ease-out',
        'slide-in':     'slide-in 0.3s cubic-bezier(0.22,1,0.36,1)',
        'spin-slow':    'spin 1.8s linear infinite',
        'pulse-glow':   'pulse-glow 2.5s ease-in-out infinite',
        'loading-dot':  'loading-dot 1.4s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'float':        'float 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)'      },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(252,39,121,0)'   },
          '50%':      { boxShadow: '0 0 24px 6px rgba(252,39,121,0.18)' },
        },
        'loading-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)',   opacity: '0.3' },
          '40%':           { transform: 'scale(1)',   opacity: '1'   },
        },
        'shimmer': {
          from: { backgroundPosition: '-200% center' },
          to:   { backgroundPosition:  '200% center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)'   },
          '50%':      { transform: 'translateY(-6px)'  },
        },
      },
      backgroundImage: {
        'nykaa-gradient':  'linear-gradient(135deg, #FC2779 0%, #E8185E 50%, #C4124E 100%)',
        'card-gradient':   'linear-gradient(160deg, rgba(22,26,42,0.9) 0%, rgba(12,15,28,0.95) 100%)',
        'sidebar-gradient':'linear-gradient(180deg, #0C0F1C 0%, #080B12 100%)',
        'hero-gradient':   'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(252,39,121,0.12) 0%, transparent 60%)',
        'shimmer-gradient':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
      },
      boxShadow: {
        'pink-glow':  '0 0 28px rgba(252,39,121,0.35)',
        'pink-sm':    '0 0 14px rgba(252,39,121,0.2)',
        'card':       '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover': '0 12px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(252,39,121,0.1)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
