import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8093,
    proxy: {
      '/api': {
        target: 'http://localhost:8094',
        changeOrigin: true,
      }
    }
  }
})
