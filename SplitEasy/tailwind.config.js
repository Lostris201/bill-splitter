/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1D9E75',
          'green-dark': '#0F6E56',
          purple: '#534AB7',
          amber: '#BA7517',
          red: '#A32D2D',
        },
      },
    },
  },
  plugins: [],
};
