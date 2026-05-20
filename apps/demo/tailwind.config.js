/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui'],
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        base: '#050810',
        surface: 'rgba(255,255,255,0.03)',
        'surface-2': 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.07)',
        'border-2': 'rgba(255,255,255,0.12)',
      },
      animation: {
        'aurora': 'aurora 8s ease-in-out infinite alternate',
        'fade-up': 'fadeUp 0.5s ease both',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
      },
      keyframes: {
        aurora: {
          '0%': { opacity: '0.5', transform: 'scale(1) translate(0, 0)' },
          '100%': { opacity: '0.8', transform: 'scale(1.1) translate(2%, 2%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
