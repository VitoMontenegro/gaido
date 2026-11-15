import { describe, expect, it } from 'vitest'
import { videoLinkProblem, videoSource } from './videoSource'

describe('video sources', () => {
  it('recognizes uploaded MP4 and direct MP4 with query parameters', () => {
    expect(videoSource('a'.repeat(32) + '.mp4')?.kind).toBe('file')
    expect(videoSource('https://example.com/tour.mp4?token=abc')?.kind).toBe('file')
  })
  it('rejects Instagram as off-site contact, not as a playable video', () => {
    expect(videoSource('https://www.instagram.com/reel/Dfodq5LIvBl/?srtk=abc')).toBeNull()
    expect(videoLinkProblem('https://m.instagram.com/reels/Dfodq5LIvBl/')).toBe('instagram')
  })
  it('handles Vimeo embed URLs and preserves unlisted video hash', () => {
    expect(videoSource('https://player.vimeo.com/video/123?h=abc')).toEqual({kind:'vimeo', url:'https://player.vimeo.com/video/123?h=abc'})
  })
  it('rejects unsafe schemes, lookalike providers and non-video Instagram pages', () => {
    for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=abc', 'https://evil.test/youtu.be/abc', 'https://instagram.com/user/', 'https://user:pass@vimeo.com/123']) expect(videoSource(url)).toBeNull()
  })
})
