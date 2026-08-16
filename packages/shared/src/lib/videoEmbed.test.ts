import { describe, expect, it } from 'vitest'
import {
  autoVideoPosterUrl,
  toVideoEmbedUrl,
  youtubePosterUrl,
  youtubeVideoId,
} from './videoEmbed'

describe('youtubeVideoId', () => {
  it('parses watch url', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('parses youtu.be url', () => {
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=12')).toBe('dQw4w9WgXcQ')
  })

  it('parses embed url', () => {
    expect(youtubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
})

describe('autoVideoPosterUrl', () => {
  it('builds ytimg poster', () => {
    expect(autoVideoPosterUrl('https://youtu.be/abc123XYZ')).toBe(
      youtubePosterUrl('abc123XYZ'),
    )
  })

  it('returns empty for non-youtube', () => {
    expect(autoVideoPosterUrl('https://vimeo.com/123')).toBe('')
  })
})

describe('toVideoEmbedUrl', () => {
  it('converts youtube watch to embed', () => {
    expect(toVideoEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe(
      'https://www.youtube.com/embed/abc123',
    )
  })
})
