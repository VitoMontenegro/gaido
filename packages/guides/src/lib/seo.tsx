import { Helmet } from 'react-helmet-async'
import { resolveMediaUrl } from '@gaido/api-client/api/http'
import { clipMetaDescription, DEFAULT_OG_IMAGE_KEY, SITE_NAME } from '@gaido/site-urls/brand'
import { absoluteUrl } from '@gaido/site-urls/site'
import { useDocumentTitle } from '@gaido/ui-primitives/useDocumentTitle'
import { useJsonLd } from '@gaido/ui-primitives/useJsonLd'

export { absoluteUrl }

export function resolveOgImage(image?: string) {
  const src = image?.trim() || DEFAULT_OG_IMAGE_KEY
  const resolved = resolveMediaUrl(src)
  return resolved ? absoluteUrl(resolved) : undefined
}

const JSON_LD_URL_KEYS = new Set(['url', 'item', '@id'])
const JSON_LD_IMAGE_KEYS = new Set(['image', 'contentUrl', 'thumbnailUrl'])

export function normalizeJsonLd(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonLd)
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (typeof child === 'string') {
        if (JSON_LD_URL_KEYS.has(key) && child.startsWith('/')) {
          out[key] = absoluteUrl(child)
        } else if (JSON_LD_IMAGE_KEYS.has(key) && !child.startsWith('http')) {
          out[key] = resolveOgImage(child) ?? child
        } else {
          out[key] = child
        }
      } else {
        out[key] = normalizeJsonLd(child)
      }
    }
    return out
  }
  return value
}

type SeoProps = {
  title: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
  largeImagePreview?: boolean
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

export function Seo({ title, description, path, image, noIndex, largeImagePreview, jsonLd }: SeoProps) {
  const url = path ? absoluteUrl(path) : undefined
  const desc = clipMetaDescription(description ?? '')
  const ogImage = resolveOgImage(image)
  const rawScripts = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []
  const scripts = rawScripts.map((obj) => normalizeJsonLd(obj) as Record<string, unknown>)
  useDocumentTitle(title)
  useJsonLd(scripts)

  return (
    <Helmet prioritizeSeoTags>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && largeImagePreview && <meta name="robots" content="max-image-preview:large" />}
      {desc && <meta name="description" content={desc} />}
      {url && <link rel="canonical" href={url} />}
      {url && <link rel="alternate" hrefLang="uk" href={url} />}
      {url && <link rel="alternate" hrefLang="x-default" href={url} />}
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
    </Helmet>
  )
}
