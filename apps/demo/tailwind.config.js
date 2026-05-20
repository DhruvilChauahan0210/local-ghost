/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'monospace'],
        sans:    ['JetBrains Mono', 'monospace'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        green:  '#00ff41',
        'green-dim': '#00cc33',
        orange: '#ff6b35',
        yellow: '#f5e642',
        ink:    '#020402',
        surface:'#080c08',
        border: '#1a2a1a',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [],
};
