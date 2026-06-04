/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff3ef',
          100: '#ffe0d5',
          200: '#ffc1aa',
          300: '#ff9874',
          400: '#ff6a3c',
          500: '#E84C1E',
          600: '#d43b10',
          700: '#b02d0d',
          800: '#8e2610',
          900: '#742213',
        },
        mada: {
          green: '#007A4D',
          red:   '#FC3131',
          white: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-dot': 'pulse 1.4s ease-in-out infinite',
        'slide-up':  'slideUp 0.3s ease-out',
        'fade-in':   'fadeIn 0.4s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)',    opacity: 1 },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
      }
    },
  },
  plugins: [],
}
