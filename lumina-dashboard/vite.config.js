import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy da API para desenvolvimento local — faz com que o dashboard
    // (localhost:5173) e a API (localhost:3000) compartilhem a mesma origem
    // do ponto de vista do browser. Isso resolve o problema de cookies
    // cross-origin: o cookie é setado e lido na mesma origem (localhost:5173).
    proxy: {
      '/expapi': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
