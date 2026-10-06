import { getPublicEnv } from './env'

export type SiteMode = 'portal' | 'guides' | 'transport' | 'services'

export const PORTAL_HOST = 'gaido-ua.com'
export const GUIDES_HOST = 'svit.gaido-ua.com'
export const TRANSPORT_HOST = 'vezu.gaido-ua.com'
export const SERVICES_HOST = 'servis.gaido-ua.com'

export const GUIDES_PREFIX = '/svit'
export const SERVICES_PREFIX = '/servis'
export const TRANSPORT_PREFIX = '/vezu'

const GUIDE_PATH_RE = /^\/(guides|map|search|journal|forums|guide|excursion|city|ukrainians-in)(\/|$)/

export function siteModeFromPath(pathname: string): SiteMode {
  if (pathname === GUIDES_PREFIX || pathname.startsWith(`${GUIDES_PREFIX}/`)) return 'guides'
  if (pathname === TRANSPORT_PREFIX || pathname.startsWith(`${TRANSPORT_PREFIX}/`)) return 'transport'
  if (pathname === SERVICES_PREFIX || pathname.startsWith(`${SERVICES_PREFIX}/`)) return 'services'
  return 'portal'
}

export function getSiteMode(): SiteMode {
  const override = getPublicEnv('VITE_SITE_MODE')
  if (override === 'portal' || override === 'guides' || override === 'transport' || override === 'services') {
    return override
  }

  if (typeof window === 'undefined') return 'portal'
  const path = window.location.pathname
  const fromPath = siteModeFromPath(path)
  if (fromPath !== 'portal') return fromPath
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

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname.toLowerCase()
  return h === 'localhost' || h === '127.0.0.1'
}

function sectionOrigin(prefix: string, legacyHost: string, envKey: string): string {
  const fromEnv = getPublicEnv(envKey)?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    if (hostname === legacyHost) return `${window.location.origin}${prefix}`
    // Unified Next (and same-origin apex): all sections share one origin + path prefix.
    if (isLocalDevHost() || hostname === PORTAL_HOST || hostname === `www.${PORTAL_HOST}`) {
      return `${window.location.origin}${prefix}`
    }
  }
  return `https://${PORTAL_HOST}${prefix}`
}

export function guidesOrigin(): string {
  return sectionOrigin(GUIDES_PREFIX, GUIDES_HOST, 'VITE_GUIDES_SITE_URL')
}

export function portalOrigin(): string {
  return sectionOrigin('', PORTAL_HOST, 'VITE_PORTAL_SITE_URL')
}

export function transportOrigin(): string {
  return sectionOrigin(TRANSPORT_PREFIX, TRANSPORT_HOST, 'VITE_TRANSPORT_SITE_URL')
}

export function servicesOrigin(): string {
  return sectionOrigin(SERVICES_PREFIX, SERVICES_HOST, 'VITE_SERVICES_SITE_URL')
}

export function publicOrigin(): string {
  const fromEnv = getPublicEnv('VITE_PUBLIC_SITE_URL')?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') return window.location.origin
  return `https://${PORTAL_HOST}`
}

/** Path prefix for the current section (no trailing slash). Empty for portal. */
export function sectionBasePath(): string {
  switch (getSiteMode()) {
    case 'guides':
      return GUIDES_PREFIX
    case 'services':
      return SERVICES_PREFIX
    case 'transport':
      return TRANSPORT_PREFIX
    default:
      return ''
  }
}

export function sectionBasePathForMode(mode: SiteMode): string {
  switch (mode) {
    case 'guides':
      return GUIDES_PREFIX
    case 'services':
      return SERVICES_PREFIX
    case 'transport':
      return TRANSPORT_PREFIX
    default:
      return ''
  }
}

export function routerBasename(): string | undefined {
  return sectionBasePath() || undefined
}

/** Origin stored for auth emails. Includes /svit, /servis or /vezu in production. */
export function authReturnOrigin(): string {
  if (typeof window === 'undefined') return publicOrigin()
  return `${window.location.origin}${sectionBasePath()}`
}

/** Page URL on the current section. `/api/` stays on the apex origin. */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  const origin = publicOrigin()
  if (p.startsWith('/api/') || p.startsWith('/media/')) return `${origin}${p}`
  const base = sectionBasePath()
  if (!base || p === base || p.startsWith(`${base}/`)) return `${origin}${p}`
  return `${origin}${base}${p}`
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

/** Куди вести після входу на vezu.gaido-ua.com */
export function transportPostLoginUrl(from: string | undefined, roles: string[]): string {
  if (from?.startsWith('/admin') || from?.startsWith('/moderator') || from?.startsWith('/downloads')) {
    if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_MODERATOR')) return from
  }
  if (roles.includes('ROLE_ADMIN')) return '/admin'
  if (roles.includes('ROLE_MODERATOR')) return '/moderator'
  if (roles.includes('ROLE_CARRIER')) return '/account/rides'
  return from?.startsWith('/account') ? from : '/account/bookings'
}

/** Куди вести після входу на servis.gaido-ua.com */
export function servicesPostLoginUrl(from: string | undefined, roles: string[]): string {
  if (from?.startsWith('/admin') || from?.startsWith('/moderator') || from?.startsWith('/downloads')) {
    if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_MODERATOR')) return from
  }
  if (roles.includes('ROLE_ADMIN')) return '/admin'
  if (roles.includes('ROLE_MODERATOR')) return '/moderator'
  if (roles.includes('ROLE_PROVIDER')) return '/account/provider'
  return from?.startsWith('/account') ? from : '/account'
}

/** Куди вести після входу на gaido-ua.com (portal). */
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
