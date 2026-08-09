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
})
