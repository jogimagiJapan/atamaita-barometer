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
        danger: '#dc2626', // 警戒 (Deep Red)
        warning: '#ea580c', // 注意 (Deep Orange)
        caution: '#ca8a04', // やや注意 (Deep Yellow/Gold)
        rising: '#9333ea', // 上昇注意 (Deep Purple)
      },
    },
  },
  plugins: [],
}
