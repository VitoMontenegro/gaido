import { videoSource } from './videoSource'

export function youtubeVideoId(url: string): string | null {
  const source = videoSource(url)
  return source?.kind === 'youtube' ? source.url.split('/embed/')[1] : null
}

export function youtubePosterUrl(id: string, quality: 'maxres' | 'hq' = 'maxres') {
  const file = quality === 'maxres' ? 'maxresdefault' : 'hqdefault'
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`
}

export function toVideoEmbedUrl(url: string): string {
  return videoSource(url)?.url ?? url.trim()
}

export function autoVideoPosterUrl(url: string): string {
  const ytId = youtubeVideoId(url)
  return ytId ? youtubePosterUrl(ytId) : ''
}
