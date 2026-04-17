import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/fabric')) return 'fabric'
          if (id.includes('node_modules/jspdf')) return 'pdf'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
