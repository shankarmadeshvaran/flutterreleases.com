/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Flutter official colors
        'flutter-blue': {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3', // Primary Flutter blue
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
        'flutter-green': {
          50: '#e8f5e8',
          100: '#c8e6c8',
          200: '#a8d7a8',
          300: '#88c888',
          400: '#68b968',
          500: '#4caf50', // Flutter green
          600: '#43a047',
          700: '#388e3c',
          800: '#2e7d32',
          900: '#1b5e20',
        },
        'flutter-gray': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        }
      },
      fontFamily: {
        'sans': ['Google Sans', 'Roboto', 'system-ui', 'sans-serif'],
        'mono': ['Roboto Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'flutter-card': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'flutter-card-hover': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        'flutter-card-dark': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.4)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
          maxWidth: {
            'flutter': '1200px',
            '6xl': '72rem',
          }
    },
  },
  plugins: [],
}
