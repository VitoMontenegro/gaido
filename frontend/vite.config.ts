import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname, '..'), '')
  const backendPort = (env.HTTP_ADDR || env.BACKEND_PORT || ':8081').replace(/^:/, '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true },
        '/healthz': { target: `http://localhost:${backendPort}` },
        '/readyz': { target: `http://localhost:${backendPort}` },
      },
    },
  }
})
