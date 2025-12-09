/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'Poppins', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        brand: {
          50: '#e8f4ff',
          100: '#d7e9ff',
          200: '#a8cbff',
          400: '#5aa0ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#0b1221'
        },
        accent: {
          50: '#fff7eb',
          100: '#ffe8c7',
          200: '#ffd08c',
          400: '#fbbf24',
          600: '#d97706',
          700: '#b45309'
        },
        surface: {
          900: '#0c1424',
          800: '#111a2e',
          700: '#162038'
        }
      },
      boxShadow: {
        soft: '0 20px 80px -24px rgba(0,0,0,0.55), 0 10px 40px -16px rgba(59,130,246,0.22)',
        glass: '0 10px 30px rgba(0,0,0,0.35)'
      },
      backgroundImage: {
        'grid-slate': 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 400ms ease-out'
      }
    }
  },
  plugins: []
};
