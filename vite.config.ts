import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // index.html is the product. landing-demo.html previews src/landing only.
      input: { main: 'index.html', 'landing-demo': 'landing-demo.html' },
    },
  },
})
