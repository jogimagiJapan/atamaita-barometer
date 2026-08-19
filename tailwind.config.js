/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        danger: '#f43f5e',
        warning: '#f59e0b',
        caution: '#fbbf24',
        rising: '#8b5cf6',
      },
    },
  },
  plugins: [],
}
