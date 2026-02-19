/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        'vol-low': '#34d399',
        'vol-mid': '#facc15',
        'vol-high': '#f87171',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      boxShadow: {
        'glow-emerald': '0 0 20px rgba(52, 211, 153, 0.2)',
        'glow-yellow': '0 0 20px rgba(250, 204, 21, 0.2)',
        'glow-red': '0 0 20px rgba(248, 113, 113, 0.2)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
