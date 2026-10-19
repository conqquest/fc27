/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          green: '#2d5a1b',
          light: '#3a7023',
          line: '#ffffff',
        },
        ui: {
          dark: '#0a0a0f',
          card: '#12121a',
          border: '#2a2a3a',
          accent: '#00d4ff',
          gold: '#ffd700',
          red: '#ff3333',
          green: '#33ff88',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
