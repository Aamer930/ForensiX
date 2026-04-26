/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon:    '#22C55E',
        dark:    '#020617',
        surface: '#0F172A',
        surface2:'#1E293B',
        border:  '#1E293B',
        muted:   '#64748B',
      },
      fontFamily: {
        mono: ['Fira Code', 'Courier New', 'monospace'],
        sans: ['Fira Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 10px #22C55E, 0 0 30px rgba(34,197,94,0.4)',
      },
    },
  },
  plugins: [],
}
