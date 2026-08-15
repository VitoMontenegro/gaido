import { Helmet } from 'react-helmet-async'
import { SITE_NAME } from './brand'

const SITE_ORIGIN = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '')
  || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

export function absoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${p}`
}

type SeoProps = {
  title: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function Seo({ title, description, path, image, noIndex, jsonLd }: SeoProps) {
  const url = path ? absoluteUrl(path) : undefined
  const desc = (description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const ogImage = image ? absoluteUrl(image) : undefined
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
      {scripts.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  )
}
