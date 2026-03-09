/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7e8',
          100: '#d4eabd',
          200: '#b3d88a',
          300: '#8dc459',
          400: '#6fb034',
          500: '#2D5016',
          600: '#264412',
          700: '#1e370e',
          800: '#162a0a',
          900: '#0e1c07',
        },
        beige: {
          50: '#fdf9f4',
          100: '#F5E6D3',
          200: '#ead0b0',
          300: '#deba8d',
          400: '#d2a46a',
        },
        coral: {
          400: '#ff8a80',
          500: '#C97664',
          600: '#b5624f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
