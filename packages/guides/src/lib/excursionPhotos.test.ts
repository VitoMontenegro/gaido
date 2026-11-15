import { describe, it, expect } from 'vitest'
import { normalizeStructuredContent, syncCoverFromGallery, mergePersistedPhotos, galleryUrls } from './excursionStructuredContent'

describe('explicit gallery deletion', () => {
  const empty = normalizeStructuredContent({ gallery_managed: true, gallery: [], gallery_mobile_cover: 'phone.webp', photo_locations: ['place.webp'] })
  it('does not restore a deleted gallery on save or display', () => {
    expect(syncCoverFromGallery('old.webp', empty).cover).toBe('')
    expect(syncCoverFromGallery('old.webp', empty).content.gallery).toEqual([])
    expect(galleryUrls(empty, 'old.webp')).toEqual([])
  })
  it('preserves deletion when merging photo autosave with saved text', () => {
    const merged = mergePersistedPhotos(normalizeStructuredContent({ gallery: ['old.webp'], route_stops: ['Музей'] }), empty)
    expect(merged.gallery_managed).toBe(true)
    expect(merged.gallery).toEqual([])
    expect(merged.route_stops).toEqual(['Музей'])
  })
  it('keeps legacy cover fallback for untouched excursions', () => {
    expect(syncCoverFromGallery('old.webp', normalizeStructuredContent()).content.gallery).toEqual(['old.webp'])
  })
  it('saves, replaces and clears video without restoring preview images', () => {
    const saved = normalizeStructuredContent({ video: { url: 'https://youtu.be/old', preview_desktop: 'old.webp' }, route_stops: ['Музей'] })
    expect(mergePersistedPhotos(saved, { ...saved, video: { url: 'https://youtu.be/dQw4w9WgXcQ' } }).video).toEqual({
      url: 'https://youtu.be/dQw4w9WgXcQ',
    })
    expect(mergePersistedPhotos(saved, { ...saved, video: { url: '' } }).video).toBeUndefined()
    expect(mergePersistedPhotos(saved, { ...saved, video: undefined, gallery: ['new.webp'] }).video?.url).toBe('https://youtu.be/old')
  })
  it('keeps an MP4 poster when autosaving photos', () => {
    const saved = normalizeStructuredContent({ video: { url: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp4', preview_desktop: 'frame.jpg' }, route_stops: ['Музей'] })
    expect(mergePersistedPhotos(saved, { ...saved, video: { url: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mp4', preview_desktop: 'next.jpg' } }).video).toEqual({
      url: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mp4',
      preview_desktop: 'next.jpg',
    })
  })
})
