import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // @ts-expect-error: vitest config is available at runtime, not typed here
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  }
})
