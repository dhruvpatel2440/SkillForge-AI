/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#b68235',
          100: '#f5e9d0',
          200: '#e8cfa0',
          300: '#d9b470',
          400: '#c99948',
          500: '#b68235',
          600: '#9a6d28',
          700: '#7e581e',
          800: '#634315',
          900: '#47300d',
        },
        neutral: {
          100: '#f3f2f2',
          200: '#e8e6e5',
          300: '#d4d1cf',
          400: '#bfbbb9',
          500: '#a09b99',
          600: '#7d7979',
          700: '#605d5d',
          800: '#433f3f',
          900: '#201f1d',
        },
        bg: '#f3f2f2',
        text: '#201f1d',
        divider: '#d4d1cf',
        muted: '#7d7979',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '32px',
        '8': '48px',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      },
    },
  },
  plugins: [],
}
