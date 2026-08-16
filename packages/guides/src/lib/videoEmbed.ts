export function youtubeVideoId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    if (trimmed.includes('youtu.be/')) {
      return trimmed.split('youtu.be/')[1]?.split(/[?&#/]/)[0] ?? null
    }

    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    if (!parsed.hostname.includes('youtube.com') && !parsed.hostname.includes('youtu.be')) {
      return null
    }

    if (parsed.pathname === '/watch') {
      return parsed.searchParams.get('v')
    }

    const embed = parsed.pathname.match(/^\/embed\/([^/?]+)/)
    if (embed) return embed[1]

    const shorts = parsed.pathname.match(/^\/shorts\/([^/?]+)/)
    if (shorts) return shorts[1]
  } catch {
    return null
  }

  return null
}

export function youtubePosterUrl(id: string, quality: 'maxres' | 'hq' = 'maxres') {
  const file = quality === 'maxres' ? 'maxresdefault' : 'hqdefault'
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`
}

export function toVideoEmbedUrl(url: string): string {
  const trimmed = url.trim()
  const ytId = youtubeVideoId(trimmed)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`

  if (trimmed.includes('vimeo.com/')) {
    const id = trimmed.split('vimeo.com/')[1]?.split(/[?&/]/)[0]
    if (id) return `https://player.vimeo.com/video/${id}`
  }

  return trimmed
}

export function autoVideoPosterUrl(url: string): string {
  const ytId = youtubeVideoId(url)
  return ytId ? youtubePosterUrl(ytId) : ''
}
