import { describe, expect, it } from 'vitest'
import { normalizeHref, sanitizeHtml } from './html'

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    const out = sanitizeHtml('<p>Hi</p><script>alert(1)</script>')
    expect(out.toLowerCase()).not.toContain('script')
    expect(out).toContain('Hi')
  })

  it('wraps plain text', () => {
    expect(sanitizeHtml('hello')).toContain('hello')
  })

  it('strips form label artifacts from pasted editor content', () => {
    const out = sanitizeHtml(
      '<ul><li><span class="block text-sm font-medium text-stone-700">Повний опис</span></li></ul>',
    )
    expect(out).not.toContain('text-stone-700')
    expect(out).toContain('Повний опис')
  })
})

describe('normalizeHref', () => {
  it('keeps shared Google Maps app links', () => {
    const url = 'https://maps.app.goo.gl/GpxqXFwzyphKdWDW8?g_st=ic'
    expect(normalizeHref(url)).toBe(url)
  })

  it('adds https to bare maps hosts', () => {
    expect(normalizeHref('maps.app.goo.gl/xyz')).toBe('https://maps.app.goo.gl/xyz')
  })

  it('strips trailing punctuation', () => {
    expect(normalizeHref('https://maps.google.com/maps?q=1.')).toBe('https://maps.google.com/maps?q=1')
  })
})
