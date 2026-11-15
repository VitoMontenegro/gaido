import { describe, expect, it } from 'vitest'
import { descriptionFromHtml, excursionPreviewText } from '../components/excursionUi'

describe('descriptionFromHtml', () => {
  it('extracts plain text and decodes entities', () => {
    expect(descriptionFromHtml('<p>Прогулянка&nbsp;містом &amp; історія</p><p>Для всіх</p>')).toBe('Прогулянка містом & історія Для всіх')
  })
  it('limits long descriptions at a word boundary', () => {
    const result = descriptionFromHtml(`<p>${'екскурсія '.repeat(30)}</p>`)
    expect(Array.from(result).length).toBeLessThanOrEqual(160)
    expect(result.endsWith('екскурсія…')).toBe(true)
  })
})

it('uses new, then full, then short descriptions', () => {
  expect(excursionPreviewText({ description_html: '<p>Нове</p>', body_html: '<p>Повне</p>', description: 'Коротке' })).toBe('Нове')
  expect(excursionPreviewText({ description_html: '', body_html: '<p>Повне</p>', description: 'Коротке' })).toBe('Повне')
  expect(excursionPreviewText({ description: 'Коротке' })).toBe('Коротке')
})
