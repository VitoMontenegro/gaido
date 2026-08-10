import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const frontendDir = import.meta.dirname
  const root = resolve(frontendDir, '..')
  const env = {
    ...loadEnv(mode, root, ''),
    ...loadEnv(mode, resolve(root, '.local'), ''),
    ...loadEnv(mode, frontendDir, ''),
  }
  const backendPort = (
    process.env.HTTP_ADDR ||
    process.env.BACKEND_PORT ||
    env.HTTP_ADDR ||
    env.BACKEND_PORT ||
    ':8091'
  ).replace(/^:/, '')
  const frontendPort = Number(
    process.env.FRONTEND_PORT || process.env.PORT || env.FRONTEND_PORT || 5173,
  )

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: frontendPort,
      proxy: {
        '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true },
        '/healthz': { target: `http://localhost:${backendPort}` },
        '/readyz': { target: `http://localhost:${backendPort}` },
      },
    },
  }
})
