import type { PageMeta } from '../lib/pageMeta'

/**
 * data-rh marks tags react-helmet-async already owns, so the client updates
 * them after hydration instead of appending a second description / Open Graph set.
 */
export function SeoHead({ meta, noIndex }: { meta: PageMeta; noIndex: boolean }) {
  const title = meta.title || 'Gaido UA'
  const description = (meta.description || '').trim()
  const canonical = (meta.canonical || '').trim()
  const image = (meta.og_image || '').trim()
  const robots = noIndex
    ? 'noindex, nofollow'
    : meta.large_image_preview
      ? 'max-image-preview:large'
      : 'index, follow'

  return (
    <>
      <title data-rh="true">{title}</title>
      {description ? <meta data-rh="true" name="description" content={description} /> : null}
      <meta data-rh="true" name="robots" content={robots} />
      {canonical ? <link data-rh="true" rel="canonical" href={canonical} /> : null}
      {canonical ? <link data-rh="true" rel="alternate" hrefLang="uk" href={canonical} /> : null}
      {canonical ? <link data-rh="true" rel="alternate" hrefLang="x-default" href={canonical} /> : null}
      <meta data-rh="true" property="og:type" content="website" />
      <meta data-rh="true" property="og:locale" content="uk_UA" />
      <meta data-rh="true" property="og:site_name" content="Gaido UA" />
      <meta data-rh="true" property="og:title" content={title} />
      {description ? <meta data-rh="true" property="og:description" content={description} /> : null}
      {canonical ? <meta data-rh="true" property="og:url" content={canonical} /> : null}
      {image ? <meta data-rh="true" property="og:image" content={image} /> : null}
      <meta data-rh="true" name="twitter:card" content="summary_large_image" />
      <meta data-rh="true" name="twitter:title" content={title} />
      {description ? <meta data-rh="true" name="twitter:description" content={description} /> : null}
      {image ? <meta data-rh="true" name="twitter:image" content={image} /> : null}
    </>
  )
}
