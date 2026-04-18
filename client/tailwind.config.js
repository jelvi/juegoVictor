/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fef9ec',
          100: '#fdf0c8',
          200: '#fbdf8d',
          300: '#f8c84a',
          400: '#f5ae1a',
          500: '#e9940c',
          600: '#cb7007',
          700: '#a54f0a',
          800: '#883e0f',
          900: '#723412',
        },
      },
    },
  },
  plugins: [],
};
