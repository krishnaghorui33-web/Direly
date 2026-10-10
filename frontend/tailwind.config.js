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
        bg: {
          app: '#0B1117',
          nav: '#0F1720',
          card: '#141F2B',
          hover: '#192734',
          input: '#101923',
        },
        border: {
          DEFAULT: '#263746',
          subtle: '#1D2A36',
          focus: '#42D6C5',
        },
        accent: {
          teal: '#14B8A6',
          'teal-hover': '#0D9488',
          'teal-soft': '#123A3A',
          cyan: '#67E8F9',
        },
        txt: {
          primary: '#E6EDF3',
          secondary: '#A4B3C2',
          muted: '#718396',
          disabled: '#526170',
        },
        status: {
          success: '#34D399',
          warning: '#FBBF24',
          error: '#FB7185',
          info: '#67E8F9',
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
