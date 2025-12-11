/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-dark': '#1d4ed8',
        'background-light': '#F8FAFC',
        'background-dark': '#0F172A',
        'surface-light': 'rgba(255, 255, 255, 0.7)',
        'surface-dark': 'rgba(30, 41, 59, 0.7)',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        neumorphic: '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
