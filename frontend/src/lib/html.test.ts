import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './html'

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
