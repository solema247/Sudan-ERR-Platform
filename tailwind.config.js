// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primaryGreen: '#4A6798',
        brand: {
          blue: '#5D7EB3',
          deep: '#4A6798',
          darker: '#3F5A87',
          orange: '#F9A778',
          orangeSoft: '#FDEBDF',
        },
        // Soft workspace surfaces (ERR blue/orange tinted)
        surface: {
          page: '#F3F6FB',
          panel: '#FFFFFF',
          muted: '#E8EEF6',
          warm: '#FFF6F0',
        },
        ink: {
          DEFAULT: '#1F2A3D',
          muted: '#5B6B82',
          faint: '#8A97AB',
        },
        green: {
          50: '#EEF2F8',
          100: '#DCE4F1',
          200: '#BCCBE3',
          300: '#9BB0D4',
          400: '#7B96C4',
          500: '#5D7EB3',
          600: '#4A6798',
          700: '#3F5A87',
          800: '#33496D',
          900: '#263754',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31, 42, 61, 0.04), 0 4px 16px rgba(74, 103, 152, 0.08)',
        lift: '0 2px 8px rgba(31, 42, 61, 0.06), 0 8px 24px rgba(74, 103, 152, 0.1)',
      },
      borderRadius: {
        xl2: '1rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
