import { NextResponse, type NextRequest } from 'next/server'

const SECTION_ROOTS = new Set(['/svit', '/servis', '/vezu'])
const SECTION_ROOT_SLASH = new Set(['/svit/', '/servis/', '/vezu/'])

/**
 * Sitemap and Go canonicals use a trailing slash only on /, /svit/, /servis/, /vezu/.
 * Nested pages stay without a slash so the URL that returns 200 is the canonical.
 */
export function middleware(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next()
  }
  const host = (request.headers.get('host') || '').replace(/:\d+$/, '').toLowerCase()
  const { pathname, search, protocol, port } = request.nextUrl
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
  // Строка, не NextURL: за прокси NextURL смотрит на localhost:3000 и теряет pathname.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = (
    forwardedHost
      ? request.headers.get('x-forwarded-proto') || 'https'
      : protocol.replace(/:$/, '') || 'http'
  )
    .split(',')[0]
    .trim()
  if (forwardedHost) {
    publicHost = forwardedHost.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase()
    if (publicHost === 'www.gaido-ua.com') publicHost = 'gaido-ua.com'
  }
  const publicPort = forwardedHost || !port ? '' : `:${port}`
  const dest = `${proto}://${publicHost}${publicPort}${pathnameOut}${search}`
  return NextResponse.redirect(dest, 308)
}

export const config = {
  matcher: [
    '/((?!api/|_next/|fonts/|images/|favicon\\.png|apple-touch-icon\\.png|icons\\.svg|logo(?:-mark)?\\.svg|robots\\.txt|sitemap\\.xml).*)',
  ],
}
