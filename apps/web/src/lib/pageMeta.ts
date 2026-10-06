export type CrawlLink = { label: string; href: string }
export type CrawlSection = { title: string; paragraphs: string[]; links?: CrawlLink[] }
export type CrawlFAQ = { question: string; answer: string }

export type CrawlBody = {
  h1?: string
  paragraphs?: string[]
  sections?: CrawlSection[]
  faq?: CrawlFAQ[]
}

export type PageMeta = {
  title: string
  description: string
  canonical: string
  og_image?: string
  no_index?: boolean
  large_image_preview?: boolean
  json_ld?: string[]
  crawl_body?: CrawlBody
  /** false when Go has no page for this path, or the API call failed */
  found?: boolean
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://gaido-ua.com').replace(/\/$/, '')
}

/** Public hostname. Local run-local/docker set NEXT_PUBLIC_SITE_URL; prod bakes https://gaido-ua.com at build. */
export function siteHostFromEnv(): string {
  try {
    return new URL(siteOrigin()).hostname.toLowerCase()
  } catch {
    return 'gaido-ua.com'
  }
}

function apiBase(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.API_INTERNAL_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
      'http://127.0.0.1:8091'
    )
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
}

function fallbackMeta(path: string): PageMeta {
  return {
    title: 'Gaido UA',
    description: 'Для українців — від українців',
    canonical: `${siteOrigin()}${path === '/' ? '/' : path}`,
    no_index: true,
    found: false,
  }
}

export async function fetchPageMeta(pathname: string): Promise<PageMeta> {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const url = `${apiBase()}/api/v1/seo/page-meta?path=${encodeURIComponent(path)}&host=${encodeURIComponent(siteHostFromEnv())}`
  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return fallbackMeta(path)
    const meta = (await res.json()) as PageMeta
    if (meta.found === false) {
      return { ...fallbackMeta(path), ...meta, no_index: true, found: false, crawl_body: undefined }
    }
    return meta
  } catch {
    return fallbackMeta(path)
  }
}

export function pathnameFromSlug(slug?: string[]): string {
  if (!slug || slug.length === 0) return '/'
  return `/${slug.join('/')}`
}
