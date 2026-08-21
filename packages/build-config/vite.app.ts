import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'

const DEFAULT_OG_IMAGE_KEY = 'd2b27d81f09874a08b4dc3293fe67f2e.webp'

export type SiteMode = 'portal' | 'guides' | 'transport' | 'services'

export type VerticalPackage = 'portal' | 'guides' | 'discover' | 'transport'

type AppViteOptions = {
  appDir: string
  defaultPort: number
  siteMode: SiteMode
  /** Vertical package name under packages/ — owns public/ and theme */
  verticalPackage?: VerticalPackage
  leaflet?: boolean
}

function pkgDir(root: string, name: string) {
  return resolve(root, 'packages', name)
}

/** run-local.sh writes .local/ports.env — Vite loadEnv does not read that filename. */
function loadLocalPorts(root: string): Record<string, string> {
  const path = resolve(root, '.local/ports.env')
  if (!existsSync(path)) return {}

  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

function socialMetaHtmlPlugin(siteOrigin: string): Plugin {
  const origin = siteOrigin.replace(/\/$/, '')
  const ogImage = `${origin}/api/v1/media/public/${DEFAULT_OG_IMAGE_KEY}`
  const tags = [
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ].join('\n    ')

  return {
    name: 'gaido-social-meta',
    transformIndexHtml(html) {
      return html.replace('</head>', `    ${tags}\n  </head>`)
    },
  }
}

export function createAppViteConfig({
  appDir,
  defaultPort,
  siteMode,
  verticalPackage = 'portal',
  leaflet = false,
}: AppViteOptions) {
  return defineConfig(({ mode }) => {
    const root = resolve(appDir, '../..')
    const verticalDir = pkgDir(root, verticalPackage)
    const publicDir = resolve(verticalDir, 'public')

    const env = {
      ...loadEnv(mode, root, ''),
      ...loadEnv(mode, resolve(root, '.local'), ''),
      ...loadEnv(mode, appDir, ''),
    }
    const localPorts = loadLocalPorts(root)
    // .local/ports.env (from run-local.sh) wins over static .env defaults — backend may bind a fallback port.
    const backendPort = (
      process.env.HTTP_ADDR ||
      process.env.BACKEND_PORT ||
      localPorts.HTTP_ADDR ||
      localPorts.BACKEND_PORT ||
      env.HTTP_ADDR ||
      env.BACKEND_PORT ||
      ':8091'
    ).replace(/^:/, '')
    const frontendPort = Number(
      process.env.FRONTEND_PORT || process.env.PORT || env.FRONTEND_PORT || defaultPort,
    )
    const siteOrigin =
      env.VITE_PUBLIC_SITE_URL ||
      localPorts.PUBLIC_BASE_URL ||
      `http://localhost:${frontendPort}`

    const aliases: Record<string, string> = {
      '@gaido/api-client': resolve(root, 'packages/api-client/src'),
      '@gaido/ui-primitives': resolve(root, 'packages/ui-primitives/src'),
      '@gaido/site-urls': resolve(root, 'packages/site-urls/src'),
      '@gaido/portal-shell': resolve(root, 'packages/portal/src'),
      '@gaido/guides': resolve(root, 'packages/guides/src'),
      '@gaido/discover': resolve(root, 'packages/discover/src'),
      '@gaido/transport': resolve(root, 'packages/transport/src'),
    }

    const config: UserConfig = {
      plugins: [react(), tailwindcss(), socialMetaHtmlPlugin(siteOrigin)],
      envDir: root,
      publicDir,
      define: {
        'import.meta.env.VITE_SITE_MODE': JSON.stringify(siteMode),
      },
      resolve: {
        alias: aliases,
        dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
      },
      server: {
        port: frontendPort,
        strictPort: true,
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

    config.build = {
      rolldownOptions: {
        output: {
          // TinyMCE skins/plugins register via global tinymce — keep module order stable.
          strictExecutionOrder: true,
        },
      },
    }

    return config
  })
}
