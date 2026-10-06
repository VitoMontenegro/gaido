import type { NextConfig } from 'next'
import path from 'path'

const repoRoot = path.join(__dirname, '../..')

const apiTarget =
  process.env.API_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8091'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Slash only on section roots (/svit/, /servis/, /vezu/). See middleware.ts.
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  // Monorepo: transpile workspace packages from source
  transpilePackages: [
    '@gaido/api-client',
    '@gaido/site-urls',
    '@gaido/ui-primitives',
    '@gaido/portal-shell',
    '@gaido/guides',
    '@gaido/discover',
    '@gaido/transport',
  ],
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gaido-ua.com', pathname: '/api/v1/media/public/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/api/v1/media/public/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/api/v1/media/public/**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: '/robots.txt',
        destination: `${apiTarget}/robots.txt`,
      },
      {
        source: '/sitemap.xml',
        destination: `${apiTarget}/sitemap.xml`,
      },
    ]
  },
  async redirects() {
    return [
      { source: '/discover', destination: '/servis/', permanent: true },
      { source: '/guides', destination: '/svit/guides', permanent: true },
      { source: '/guides/:path*', destination: '/svit/guides/:path*', permanent: true },
      { source: '/search', destination: '/svit/search', permanent: true },
      { source: '/map', destination: '/svit/map', permanent: true },
      { source: '/journal', destination: '/svit/journal', permanent: true },
      { source: '/journal/:path*', destination: '/svit/journal/:path*', permanent: true },
      { source: '/forums', destination: '/svit/forums', permanent: true },
      { source: '/forums/:path*', destination: '/svit/forums/:path*', permanent: true },
      { source: '/guide/:slug', destination: '/svit/guide/:slug', permanent: true },
      { source: '/excursion/:slug', destination: '/svit/excursion/:slug', permanent: true },
      { source: '/excursions', destination: '/svit/search', permanent: true },
      { source: '/city/:slug', destination: '/svit/city/:slug', permanent: true },
      { source: '/countries', destination: '/svit/search', permanent: true },
      { source: '/countries/:path*', destination: '/svit/countries/:path*', permanent: true },
      { source: '/ukrainians-in/:slug', destination: '/svit/ukrainians-in/:slug', permanent: true },
      { source: '/provider/:slug', destination: '/servis/provider/:slug', permanent: true },
      { source: '/account', destination: '/svit/account', permanent: true },
      { source: '/account/:path*', destination: '/svit/account/:path*', permanent: true },
      { source: '/register', destination: '/svit/register', permanent: true },
      { source: '/register/guide', destination: '/svit/register/guide', permanent: true },
      { source: '/legal/:slug', destination: '/svit/legal/:slug', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/jobs', destination: '/', permanent: true },
      { source: '/places', destination: '/', permanent: true },
      { source: '/help', destination: '/', permanent: true },
      { source: '/looking', destination: '/', permanent: true },
      { source: '/deploy', destination: '/downloads?app=web-prod-2026', permanent: false },
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@gaido/api-client': path.join(repoRoot, 'packages/api-client/src'),
      '@gaido/site-urls': path.join(repoRoot, 'packages/site-urls/src'),
      '@gaido/ui-primitives': path.join(repoRoot, 'packages/ui-primitives/src'),
      '@gaido/portal-shell': path.join(repoRoot, 'packages/portal/src'),
      '@gaido/guides': path.join(repoRoot, 'packages/guides/src'),
      '@gaido/discover': path.join(repoRoot, 'packages/discover/src'),
      '@gaido/transport': path.join(repoRoot, 'packages/transport/src'),
    }
    return config
  },
}

export default nextConfig
