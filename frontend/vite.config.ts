import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Tashqaridan ulanish uchun
    allowedHosts: [
      'iqromin.uz',
      'www.iqromin.uz',
      'localhost',
      '45.138.158.199'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
