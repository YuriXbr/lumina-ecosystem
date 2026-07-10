import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const config = {
    plugins: [react()],
  }

  // Proxy só em desenvolvimento — em produção, VITE_API_BASE_URL aponta
  // para a API real (api.bot.luminasink.com) e não precisa de proxy.
  if (mode === 'development' && !env.VITE_API_BASE_URL) {
    config.server = {
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
    }
  }

  return config
})
