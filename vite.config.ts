import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Second entry: the review page of the diagrams (owned by the diagram worker).
      input: { main: 'index.html', 'diagram-demo': 'diagram-demo.html' },
    },
  },
})
