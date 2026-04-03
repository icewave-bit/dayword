import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const explicit = env.VITE_PROXY_API_TARGET?.trim()
  const proxyHost = env.VITE_BACKEND_PROXY_HOST?.trim() || '127.0.0.1'
  const apiPort = env.API_PORT?.trim() || '3001'
  /** Пустой VITE_API_URL → fetch('/api/...') на dev-сервере; без proxy будет 404. */
  const proxyTarget = explicit || `http://${proxyHost}:${apiPort}`

  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5174,
      strictPort: true,
      hmr: {
        host: 'localhost',
        clientPort: 5174,
        protocol: 'ws',
        overlay: false,
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
