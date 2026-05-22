/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Scan package source so Tailwind generates all component classes
    '../../packages/smart-data-grid/src/**/*.{ts,tsx}',
  ],
  safelist: [
    // Dynamic classes used inside local-ghost components
    'text-sky-300','text-slate-600','text-indigo-300','text-indigo-400',
    'text-emerald-400','text-red-300','text-amber-400','text-yellow-400',
    'bg-indigo-500/10','bg-indigo-500/20','bg-emerald-500/10','bg-red-500/10','bg-amber-500/10',
    'border-indigo-500/30','border-emerald-500/30','border-red-500/20','border-amber-500/20',
    'border-slate-700','border-slate-700/60','border-slate-700/80',
    'bg-slate-700','bg-slate-700/50','bg-slate-800/20','bg-slate-800/40','bg-slate-800/60',
    'bg-[#1a1d27]','bg-slate-900/80',
    'animate-spin','animate-pulse',
    'table-sticky-header',
    'font-mono','tabular-nums',
    'whitespace-nowrap',
    'overflow-x-auto','overflow-y-auto',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        vault: {
          bg:     '#070b12',
          card:   'rgba(255,255,255,0.025)',
          border: 'rgba(255,255,255,0.07)',
          green:  '#10b981',
          red:    '#f43f5e',
          muted:  '#475569',
          dim:    '#64748b',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease both',
        'fade-in': 'fadeIn 0.4s ease both',
        'count-up': 'countUp 1s ease both',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.5' },
          '50%':     { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
