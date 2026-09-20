import { sanitizeHtml } from '../lib/html'
import { isBlankHtml } from '../lib/seoTemplates'

export function PlaceExcerpt({ value, fallback }: { value?: string; fallback?: string }) {
  const text = (value ?? '').trim() || (fallback ?? '').trim()
  if (!text) return null
  return (
    <p className="mt-3 mb-6 max-w-3xl text-sm leading-relaxed text-muted md:text-base">
      {text}
    </p>
  )
}

export function PlaceBody({ html }: { html?: string }) {
  if (!html || isBlankHtml(html)) return null
  return (
    <div
      className="place-content"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}
