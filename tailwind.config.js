/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        danger: '#ef4444', // 警戒 (Red)
        warning: '#f97316', // 注意 (Orange)
        caution: '#eab308', // やや注意 (Yellow)
        rising: '#a855f7', // 上昇注意 (Purple)
      },
    },
  },
  plugins: [],
}
