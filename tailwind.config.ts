import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // UFC Theme Colors
        'ufc-red': '#D20A0A',
        'ufc-red-dark': '#A00808',
        'ufc-gold': '#C9A227',
        'ufc-black': '#0A0A0A',
        'ufc-gray': {
          900: '#121212',
          800: '#1A1A1A',
          700: '#2A2A2A',
          600: '#3A3A3A',
          500: '#4A4A4A',
          400: '#6A6A6A',
          300: '#888888',
          200: '#AAAAAA',
          100: '#CCCCCC',
        },
      },
      fontFamily: {
        'bebas': ['Bebas Neue', 'sans-serif'],
        'oswald': ['Oswald', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ufc-gradient': 'linear-gradient(135deg, #D20A0A 0%, #0A0A0A 50%, #0A0A0A 100%)',
        'card-gradient': 'linear-gradient(180deg, #1A1A1A 0%, #121212 100%)',
      },
      boxShadow: {
        'ufc': '0 0 20px rgba(210, 10, 10, 0.3)',
        'ufc-hover': '0 0 30px rgba(210, 10, 10, 0.5)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(210, 10, 10, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(210, 10, 10, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;




