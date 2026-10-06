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
  const { pathname } = request.nextUrl
  const url = request.nextUrl.clone()
  let changed = false

  if (host === 'www.gaido-ua.com') {
    url.protocol = 'https:'
    url.hostname = 'gaido-ua.com'
    url.port = ''
    changed = true
  }

  if (SECTION_ROOTS.has(pathname)) {
    url.pathname = `${pathname}/`
    changed = true
  } else if (pathname.length > 1 && pathname.endsWith('/') && !SECTION_ROOT_SLASH.has(pathname)) {
    url.pathname = pathname.replace(/\/+$/, '') || '/'
    changed = true
  }

  if (!changed) return NextResponse.next()
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: [
    '/((?!api/|_next/|fonts/|images/|favicon\\.png|apple-touch-icon\\.png|icons\\.svg|logo(?:-mark)?\\.svg|robots\\.txt|sitemap\\.xml).*)',
  ],
}
