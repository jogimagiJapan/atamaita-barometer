import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Vercel はサイトルート (/) で配信。GitHub Pages だけサブパスが必要。
  base: process.env.VERCEL ? '/' : '/atamaita-barometer/',
})
