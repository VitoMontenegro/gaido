import DOMPurify from 'isomorphic-dompurify'

export function asHtml(raw?: string) {
  const t = (raw ?? '').trim()
  if (!t) return ''
  if (/<[a-z][\s\S]*>/i.test(t)) return t
  return `<p>${t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')}</p>`
}

/** Sanitize HTML before dangerouslySetInnerHTML (defense in depth). */
export function sanitizeHtml(raw?: string): string {
  return DOMPurify.sanitize(asHtml(raw ?? ''), { USE_PROFILES: { html: true } })
}
