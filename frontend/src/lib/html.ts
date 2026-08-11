import DOMPurify from 'isomorphic-dompurify'

const FORM_LABEL_ARTIFACT =
  /(?:form-field-label|block text-sm font-medium text-stone-700)/

/** Unwrap spans pasted from form field labels (TinyMCE artifact). */
export function stripEditorArtifacts(html: string): string {
  let prev = ''
  let out = html
  const spanRe =
    /<span(?:\s[^>]*)?\sclass="([^"]*)"[^>]*>([\s\S]*?)<\/span>/gi
  while (out !== prev) {
    prev = out
    out = out.replace(spanRe, (match, className: string, inner: string) =>
      FORM_LABEL_ARTIFACT.test(className) ? inner : match,
    )
  }
  return out
}

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
  const cleaned = stripEditorArtifacts(raw ?? '')
  return DOMPurify.sanitize(asHtml(cleaned), { USE_PROFILES: { html: true } })
}
