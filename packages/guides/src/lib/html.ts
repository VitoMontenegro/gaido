import type { ReactNode } from 'react'
import { createElement } from 'react'
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

const URL_RE = /\b((?:https?:\/\/|www\.|maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.[^\s/]+\/)[^\s<>"'`]+)/gi
const TRAIL = /[),.;:!?]+$/

export function normalizeHref(raw: string): string {
  const trimmed = raw.replace(TRAIL, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = new RegExp(URL_RE.source, URL_RE.flags)
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(text)) !== null) {
    const raw = match[1]
    const start = match.index
    const punct = raw.match(TRAIL)?.[0] ?? ''
    const token = punct ? raw.slice(0, -punct.length) : raw
    if (start > last) nodes.push(text.slice(last, start))
    if (token) {
      nodes.push(
        createElement(
          'a',
          {
            key: `u-${i}-${start}`,
            href: normalizeHref(token),
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'break-all text-teal underline underline-offset-2',
          },
          token,
        ),
      )
      i += 1
    }
    if (punct) nodes.push(punct)
    last = start + raw.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length > 0 ? nodes : [text]
}

/** Sanitize HTML before dangerouslySetInnerHTML (defense in depth). */
export function sanitizeHtml(raw?: string): string {
  const cleaned = stripEditorArtifacts(raw ?? '')
  return DOMPurify.sanitize(asHtml(cleaned), { USE_PROFILES: { html: true } })
}
