import { NextResponse, type NextRequest } from 'next/server'

const SECTION_ROOTS = new Set(['/svit', '/servis', '/vezu'])
const SECTION_ROOT_SLASH = new Set(['/svit/', '/servis/', '/vezu/'])

const RESERVED_SVIT_SEGMENTS = new Set([
  'guides',
  'countries',
  'city',
  'guide',
  'excursion',
  'excursions',
  'search',
  'journal',
  'forums',
  'about',
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'favorites',
  'map',
  'discover',
  'provider',
  'jobs',
  'places',
  'help',
  'looking',
  'ukrainians-in',
  'legal',
  'account',
  'admin',
  'moderator',
  'downloads',
  'deploy',
  'news',
])

const CITY_TAIL = /^\/svit\/city\/([^/]+)\/(guides|excursions)\/?$/
const SHORT_CITY = /^\/svit\/([^/]+)\/?$/

function apiOrigin(): string {
  return (
    process.env.API_INTERNAL_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'http://127.0.0.1:8091'
  )
}

function publicURL(request: NextRequest, pathname: string, search: string): string {
  const { protocol } = request.nextUrl
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = (
    forwardedHost
      ? request.headers.get('x-forwarded-proto') || 'https'
      : protocol.replace(/:$/, '') || 'http'
  )
    .split(',')[0]
    .trim()
  if (forwardedHost) {
    let publicHost = forwardedHost.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase()
    if (publicHost === 'www.gaido-ua.com') publicHost = 'gaido-ua.com'
    return `${proto}://${publicHost}${pathname}${search}`
  }
  const origin = request.nextUrl.origin.replace(/\/$/, '')
  if (origin.includes('://www.gaido-ua.com')) {
    return `${origin.replace('://www.gaido-ua.com', '://gaido-ua.com')}${pathname}${search}`
  }
  return `${origin}${pathname}${search}`
}

async function isActiveCitySlug(slug: string): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 1500)
  try {
    const res = await fetch(`${apiOrigin()}/api/v1/geo/cities/${encodeURIComponent(slug)}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Sitemap and Go canonicals use a trailing slash only on /, /svit/, /servis/, /vezu/.
 * Nested pages stay without a slash so the URL that returns 200 is the canonical.
 * Short /svit/{city} and phantom /svit/city/{slug}/guides|excursions redirect to the city page.
 */
export async function middleware(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next()
  }
  const host = (request.headers.get('host') || '').replace(/:\d+$/, '').toLowerCase()
  const { pathname, search } = request.nextUrl

  const tail = pathname.match(CITY_TAIL)
  if (tail) {
    return NextResponse.redirect(publicURL(request, `/svit/city/${tail[1]}`, search), 308)
  }

  const short = pathname.match(SHORT_CITY)
  if (short && !RESERVED_SVIT_SEGMENTS.has(short[1].toLowerCase())) {
    if (await isActiveCitySlug(short[1])) {
      return NextResponse.redirect(publicURL(request, `/svit/city/${short[1]}`, search), 308)
    }
  }

  let pathnameOut = pathname
  let changed = false
  if (SECTION_ROOTS.has(pathname)) {
    pathnameOut = `${pathname}/`
    changed = true
  } else if (pathname.length > 1 && pathname.endsWith('/') && !SECTION_ROOT_SLASH.has(pathname)) {
    pathnameOut = pathname.replace(/\/+$/, '') || '/'
    changed = true
  }
  let publicHost = host
  if (publicHost === 'www.gaido-ua.com') {
    publicHost = 'gaido-ua.com'
    changed = true
  }
  if (!changed) return NextResponse.next()
  return NextResponse.redirect(publicURL(request, pathnameOut, search), 308)
}

export const config = {
  matcher: [
    '/((?!api/|_next/|fonts/|images/|favicon\\.png|apple-touch-icon\\.png|icons\\.svg|logo(?:-mark)?\\.svg|robots\\.txt|sitemap\\.xml).*)',
  ],
}
