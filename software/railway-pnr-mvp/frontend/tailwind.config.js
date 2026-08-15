/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        signal: {
          green: '#1F7A4D',
          amber: '#C9781E',
          red: '#B23A2E',
        },
        rail: {
          950: '#0B1220',
          900: '#111B2E',
          800: '#182543',
          700: '#233257',
          600: '#37497A',
          400: '#7C8CB0',
          200: '#D6DCEA',
          100: '#EEF1F8',
          50: '#F7F8FC',
        },
        brass: {
          400: '#C9A24B',
          500: '#B08A34',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
