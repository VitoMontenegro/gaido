import { describe, expect, it } from 'vitest'
import { isBlankHtml, placeFaqOrDefault, placeSeoDescription, placeSeoTitle, homeSeoDescription, homeSeoTitle, seoCityExcursionsHeading, seoGuideHeading, seoGuideSubtitle } from './seoTemplates'

describe('place page helpers', () => {
  it('treats empty editor html as blank', () => {
    expect(isBlankHtml('<p></p>')).toBe(true)
    expect(isBlankHtml('<p><br></p>')).toBe(true)
    expect(isBlankHtml('<p>Текст</p>')).toBe(false)
  })

  it('uses custom faq when filled', () => {
    const custom = [{ question: 'Q', answer: 'A' }]
    const fallback = [{ question: 'F', answer: 'B' }]
    expect(placeFaqOrDefault(custom, fallback)).toEqual(custom)
    expect(placeFaqOrDefault([], fallback)).toEqual(fallback)
  })

  it('keeps custom seo fields', () => {
    expect(placeSeoDescription('  Custom  ', 'fallback')).toBe('Custom')
    expect(placeSeoDescription('', 'fallback')).toBe('fallback')
    expect(placeSeoTitle('Грузія', 'fallback')).toContain('Грузія')
    expect(homeSeoTitle('Головна')).toContain('Головна')
    expect(homeSeoTitle('')).toContain('Україномовні гіди та екскурсії за кордоном')
    expect(seoCityExcursionsHeading('Рим')).toBe('Екскурсії українською у Римі')
    expect(seoGuideHeading('Олена', 'Прага · Відень')).toBe('Олена — гід українською у Празі')
    expect(seoGuideSubtitle('')).toBe('Гід українською')
    expect(homeSeoDescription('  Custom  ', 'hero')).toBe('Custom')
    expect(homeSeoDescription('', 'hero subtitle')).toBe('hero subtitle')
  })
})
