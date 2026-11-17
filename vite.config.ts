import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // index.html is the product. The two demo pages preview one area each.
      input: { main: 'index.html', 'diagram-demo': 'diagram-demo.html', 'landing-demo': 'landing-demo.html' },
    },
  },
})
