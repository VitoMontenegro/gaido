import { Helmet } from 'react-helmet-async'
import { resolveMediaUrl } from '@gaido/api-client/api/http'
import { DEFAULT_OG_IMAGE_KEY, SITE_NAME } from '@gaido/site-urls/brand'

const SITE_ORIGIN = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '')
  || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

export function absoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${p}`
}

export function resolveOgImage(image?: string) {
  const src = image?.trim() || DEFAULT_OG_IMAGE_KEY
  const resolved = resolveMediaUrl(src)
  return resolved ? absoluteUrl(resolved) : undefined
}

type SeoProps = {
  title: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function DefaultSocialMeta() {
  const ogImage = resolveOgImage()

  return (
    <Helmet>
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  )
}

export function Seo({ title, description, path, image, noIndex, jsonLd }: SeoProps) {
  const url = path ? absoluteUrl(path) : undefined
  const desc = (description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const ogImage = resolveOgImage(image)
  const scripts = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <Helmet>
      <title>{title}</title>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {desc && <meta name="description" content={desc} />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      {url && <meta property="og:url" content={url} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {scripts.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  )
}
