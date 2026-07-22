import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js"
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/submissions': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/artifacts': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
})

