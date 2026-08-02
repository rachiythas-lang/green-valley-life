/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#8FD694',
          500: '#4DAA57',
          600: '#72B16E',
          700: '#3d8b47',
          800: '#166534',
          900: '#14532d',
        },
        accent: '#CBEF43',
        sky: '#87CEEB',
        cream: '#F8F7F3',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
};
