/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        klein: {
          50:  '#E6EDFF',
          100: '#B3C8FF',
          200: '#80A3FF',
          300: '#4D7EFF',
          400: '#1A59FF',
          500: '#002FA7',
          600: '#002A94',
          700: '#002070',
          800: '#00164D',
          900: '#000D2E',
        },
      },
      fontFamily: {
        pixel: ['Silkscreen', 'monospace'],
      },
      borderWidth: {
        'pixel': '2px',
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fall-in': 'fallIn 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fallIn: {
          '0%': {
            transform: 'translateY(-100px) scale(0.5)',
            opacity: '0',
          },
          '50%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(0) scale(1)',
            opacity: '1',
          },
        },
      },
    },
  },
  plugins: [],
}
