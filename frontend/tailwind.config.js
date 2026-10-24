/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#15803D',
          hover: '#166534',
          light: '#DCFCE7',
          dark: '#166534',
          focus: '#22C55E',
        },
        surface: {
          app: '#F8FAFC',
          sidebar: '#FFFFFF',
          header: '#FFFFFF',
          card: '#FFFFFF',
          secondary: '#F1F5F9',
          border: '#E2E8F0',
          inputBorder: '#CBD5E1',
        },
        risk: {
          critical: '#DC2626',
          warning: '#D97706',
          healthy: '#15803D',
          operational: '#15803D',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Devanagari',
          'Noto Sans Tamil',
          'Noto Sans Telugu',
          'Noto Sans Malayalam',
          'Noto Sans Kannada',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
