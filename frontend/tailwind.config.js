/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pixel: {
          green: '#7CB342',
          dark: '#33691E',
          grass: '#8BC34A',
          sky: '#81D4FA',
          wood: '#8D6E63',
          woodDark: '#5D4037',
          cream: '#FFF8E1',
          pink: '#F48FB1',
          gold: '#FFD54F',
          coin: '#FFB300',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        cute: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pixel: '4px 4px 0 #33691E',
        pixelSm: '2px 2px 0 #5D4037',
      },
    },
  },
  plugins: [],
};
