import { describe, expect, it } from 'vitest'
import { sanitizeArticleSlugInput } from './articles'

describe('sanitizeArticleSlugInput', () => {
  it('drops page URLs so backend can slugify the title', () => {
    expect(sanitizeArticleSlugInput('https://svit.gaido-ua.com/account/guide/articles')).toBe('')
    expect(sanitizeArticleSlugInput('https:/svit.gaido-ua.com/account/guide/articles')).toBe('')
  })

  it('keeps a real slug', () => {
    expect(sanitizeArticleSlugInput('yak-obraty-gida')).toBe('yak-obraty-gida')
  })
})
