import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { defineConfig, loadEnv, type UserConfig } from 'vite'

type AppViteOptions = {
  appDir: string
  defaultPort: number
  siteMode: 'portal' | 'guides' | 'transport' | 'services'
  leaflet?: boolean
}

export function createAppViteConfig({ appDir, defaultPort, siteMode, leaflet = false }: AppViteOptions) {
  return defineConfig(({ mode }) => {
    const root = resolve(appDir, '../..')
    const sharedDir = resolve(root, 'packages/shared')
    const env = {
      ...loadEnv(mode, root, ''),
      ...loadEnv(mode, resolve(root, '.local'), ''),
      ...loadEnv(mode, appDir, ''),
    }
    const backendPort = (
      process.env.HTTP_ADDR ||
      process.env.BACKEND_PORT ||
      env.HTTP_ADDR ||
      env.BACKEND_PORT ||
      ':8091'
    ).replace(/^:/, '')
    const frontendPort = Number(
      process.env.FRONTEND_PORT || process.env.PORT || env.FRONTEND_PORT || defaultPort,
    )

    const config: UserConfig = {
      plugins: [react(), tailwindcss()],
      envDir: root,
      publicDir: resolve(sharedDir, 'public'),
      define: {
        'import.meta.env.VITE_SITE_MODE': JSON.stringify(siteMode),
      },
      resolve: {
        alias: {
          '@gaido/shared': resolve(sharedDir, 'src'),
          '@gaido/discover-ui': resolve(root, 'packages/discover-ui/src'),
        },
        dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
      },
      server: {
        port: frontendPort,
        proxy: {
          '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true },
          '/healthz': { target: `http://localhost:${backendPort}` },
          '/readyz': { target: `http://localhost:${backendPort}` },
        },
      },
    }

    if (leaflet) {
      config.optimizeDeps = { include: ['leaflet'] }
    }

    return config
  })
}
