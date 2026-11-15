export type VideoSource = { kind: 'file' | 'youtube' | 'vimeo'; url: string }
export type VideoLinkProblem = 'instagram' | 'unsupported'

function videoHost(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
  } catch {
    return null
  }
}

export function videoLinkProblem(raw: string): VideoLinkProblem | null {
  const value = raw.trim()
  if (!value || videoSource(value)) return null
  const host = videoHost(value)
  if (host === 'instagram.com' || host === 'instagr.am') return 'instagram'
  return 'unsupported'
}

export function videoSource(raw: string): VideoSource | null {
  const value = raw.trim()
  if (!value) return null
  if (/^[a-f0-9]{32}\.mp4$/i.test(value)) return { kind: 'file', url: value }
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
    if (/\.mp4$/i.test(url.pathname)) return { kind: 'file', url: url.href }
    if (['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'music.youtube.com'].includes(host)) {
      const id = host === 'youtu.be' ? url.pathname.split('/')[1] : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]
      return id && /^[\w-]+$/.test(id) ? { kind: 'youtube', url: `https://www.youtube.com/embed/${id}` } : null
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1]
      if (!id) return null
      const hash = url.searchParams.get('h')
      return { kind: 'vimeo', url: `https://player.vimeo.com/video/${id}${hash ? `?h=${encodeURIComponent(hash)}` : ''}` }
    }
  } catch {
    return null
  }
  return null
}
