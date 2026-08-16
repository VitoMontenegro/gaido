import { describe, expect, it } from 'vitest'
import { resolveMapEmbed } from './mapEmbed'

describe('resolveMapEmbed', () => {
  it('accepts allowlisted https google embed', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18'
    expect(resolveMapEmbed(url)).toBe(url)
  })

  it('accepts iframe src from openstreetmap', () => {
    const iframe =
      '<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"></iframe>'
    expect(resolveMapEmbed(iframe)).toBe(
      'https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4',
    )
  })

  it('rejects http and non-allowlisted hosts', () => {
    expect(resolveMapEmbed('http://www.google.com/maps/embed')).toBeNull()
    expect(resolveMapEmbed('https://evil.tld/maps')).toBeNull()
    expect(resolveMapEmbed('https://evil-google.com/embed')).toBeNull()
    expect(resolveMapEmbed('https://example.com/page')).toBeNull()
  })

  it('rejects prose', () => {
    expect(resolveMapEmbed('Прогулянка історичним центром міста')).toBeNull()
  })
})
