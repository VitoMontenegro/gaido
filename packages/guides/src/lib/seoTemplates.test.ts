import { describe, expect, it } from 'vitest'
import { isBlankHtml, placeFaqOrDefault, placeSeoDescription, placeSeoTitle, homeSeoDescription, homeSeoHeading, homeSeoTitle, seoCityExcursionsDescription, seoCityExcursionsHeading, seoCountryExcursionsDescription, seoGuideHeading, seoGuideSubtitle } from './seoTemplates'

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
    expect(homeSeoHeading('Українські гіди та екскурсії українською')).toBe('Українські гіди та екскурсії українською')
    expect(homeSeoHeading('')).toBe('Україномовні гіди та екскурсії за кордоном')
    expect(seoCityExcursionsHeading('Рим')).toBe('Екскурсії українською у Римі')
    expect(seoGuideHeading('Олена', 'Прага · Відень')).toBe('Олена — україномовний гід у Празі')
    expect(seoGuideSubtitle('')).toBe('Україномовний гід')
    expect(seoCountryExcursionsDescription('Австрія', 2, 'від 180 €')).toBe('Екскурсії українською в Австрії від 180 €')
    expect(seoCityExcursionsDescription('Монако', 'Монако')).toBe('Гіди та авторські екскурсії українською у Монако — бронювання напряму з гідом')
    expect(seoCityExcursionsDescription('Рим', 'Італія')).toContain('Італія')
    expect(homeSeoDescription('  Custom  ', 'hero')).toBe('Custom')
    expect(homeSeoDescription('', 'hero subtitle')).toBe('hero subtitle')
  })
})
