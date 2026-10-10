/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        direly: {
          bg: '#0a0d14',
          surface: '#0f1420',
          card: '#131926',
          border: '#1e2638',
          hover: '#182133',
          purple: {
            DEFAULT: '#7c3aed',
            light: '#9061f9',
            dark: '#6d28d9',
            glow: 'rgba(124, 58, 237, 0.15)',
          },
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          slate: '#94a3b8',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
