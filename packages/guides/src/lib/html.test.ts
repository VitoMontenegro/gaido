import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SeoFaqSection from '../components/SeoFaqSection'
import { normalizeHref, sanitizeHtml, sanitizeInlineHtml } from './html'

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

describe('sanitizeInlineHtml', () => {
  it('keeps relative links and drops scripts', () => {
    const out = sanitizeInlineHtml(
      'місто — <a href="/city/london">Лондон</a>.<script>alert(1)</script>',
    )
    expect(out).toContain('<a href="/city/london">Лондон</a>')
    expect(out.toLowerCase()).not.toContain('script')
    expect(out).not.toContain('<p>')
  })

  it('leaves plain answers as text', () => {
    expect(sanitizeInlineHtml('Так. Більшість гідів.')).toBe('Так. Більшість гідів.')
  })
})

describe('SeoFaqSection', () => {
  it('renders answer links instead of escaped tags', () => {
    const html = renderToStaticMarkup(
      createElement(SeoFaqSection, {
        items: [{
          question: 'Де зібрані екскурсії?',
          answer: 'місто — <a href="/city/london">Лондон</a>.',
        }],
      }),
    )
    expect(html).toContain('<a href="/city/london">Лондон</a>')
    expect(html).not.toContain('&lt;a')
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
