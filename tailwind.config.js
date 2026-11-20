/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vice: {
          deep: '#151221',
          base: '#1b172b',
          card: '#241e38',
          elevated: '#30284a',
          lavender: '#a78bfa',
          soft: '#c4b5fd',
          rose: '#df8fa3',
          peach: '#ebb79f',
          mint: '#86d9be',
          text: '#f5f0fb',
          sub: '#c5bad6',
          muted: '#988cb0',
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
