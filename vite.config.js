import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config
export default defineConfig({
  plugins: [react()],
  base: '/CSStudyRoom/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('react-icons')) return 'vendor-icons'
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'

          return 'vendor-misc'
        },
      },
    },
  },
})
