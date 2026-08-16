export type SiteMode = 'portal' | 'guides' | 'transport' | 'services'

export const PORTAL_HOST = 'gaido.top'
export const GUIDES_HOST = 'svit.gaido.top'
export const TRANSPORT_HOST = 'vezu.gaido.top'
export const SERVICES_HOST = 'servis.gaido.top'

const GUIDE_PATH_RE = /^\/(guides|map|search|journal|guide|excursion|city|ukrainians-in)(\/|$)/

export function getSiteMode(): SiteMode {
  const override = import.meta.env.VITE_SITE_MODE as string | undefined
  if (override === 'portal' || override === 'guides' || override === 'transport' || override === 'services') {
    return override
  }

  if (typeof window === 'undefined') return 'portal'
  const host = window.location.hostname.toLowerCase()
  if (host === GUIDES_HOST || host.startsWith('svit.')) return 'guides'
  if (host === TRANSPORT_HOST || host.startsWith('vezu.')) return 'transport'
  if (host === SERVICES_HOST || host.startsWith('servis.')) return 'services'
  return 'portal'
}

export function isGuidesSite(): boolean {
  return getSiteMode() === 'guides'
}

export function isPortalSite(): boolean {
  return getSiteMode() === 'portal'
}

export function isTransportSite(): boolean {
  return getSiteMode() === 'transport'
}

export function isServicesSite(): boolean {
  return getSiteMode() === 'services'
}

export function isSectionSite(): boolean {
  const mode = getSiteMode()
  return mode === 'transport' || mode === 'services'
}

function originForHost(host: string, envKey: string): string {
  const fromEnv = (import.meta.env[envKey] as string | undefined)?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && window.location.hostname.toLowerCase() === host) {
    return window.location.origin
  }
  return `https://${host}`
}

export function guidesOrigin(): string {
  return originForHost(GUIDES_HOST, 'VITE_GUIDES_SITE_URL')
}

export function portalOrigin(): string {
  return originForHost(PORTAL_HOST, 'VITE_PORTAL_SITE_URL')
}

export function transportOrigin(): string {
  return originForHost(TRANSPORT_HOST, 'VITE_TRANSPORT_SITE_URL')
}

export function servicesOrigin(): string {
  return originForHost(SERVICES_HOST, 'VITE_SERVICES_SITE_URL')
}

export function absoluteSiteUrl(host: string, path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `https://${host}${normalized}`
}

export function guidesUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${guidesOrigin()}${normalized}`
}

export function portalUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${portalOrigin()}${normalized}`
}

export function transportUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${transportOrigin()}${normalized}`
}

export function servicesUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${servicesOrigin()}${normalized}`
}

export function isGuidePath(pathname: string): boolean {
  return GUIDE_PATH_RE.test(pathname)
}

export function redirectToGuides(pathname: string, search = '', hash = ''): string {
  const path = pathname === '/guides' ? '/' : pathname
  return `${guidesUrl(path)}${search}${hash}`
}

const PORTAL_POST_LOGIN_PATHS = ['/admin', '/moderator', '/downloads', '/deploy'] as const

function isPortalPostLoginPath(path: string): boolean {
  return PORTAL_POST_LOGIN_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))
}

/** Куди вести після входу на gaido.top (portal). */
export function portalPostLoginUrl(from: unknown, roles: string[]): string {
  const fromPath =
    typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null

  if (fromPath && isPortalPostLoginPath(fromPath)) return fromPath

  if (roles.includes('ROLE_ADMIN')) return '/admin'
  if (roles.includes('ROLE_MODERATOR')) return '/moderator'

  const accountPath = fromPath?.startsWith('/account')
    ? fromPath
    : roles.includes('ROLE_GUIDE')
      ? '/account/guide'
      : '/account'
  return guidesUrl(accountPath)
}

export function followPostLoginUrl(target: string, navigate: (path: string) => void): void {
  if (/^https?:\/\//.test(target)) {
    window.location.assign(target)
    return
  }
  navigate(target)
}

export const ALL_SITE_HOSTS = [PORTAL_HOST, GUIDES_HOST, TRANSPORT_HOST, SERVICES_HOST] as const

export const CORS_ORIGINS = ALL_SITE_HOSTS.flatMap((host) =>
  host === PORTAL_HOST ? [`https://${host}`, `https://www.${host}`] : [`https://${host}`],
)
