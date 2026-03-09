import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/reuniones/', // Cambiado de './' a '/reuniones/' para coincidir con la subcarpeta en GitHub Pages
})
