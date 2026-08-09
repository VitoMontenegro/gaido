/** Accepts maps embed URL or full <iframe ...> HTML. Rejects plain text. */
export function resolveMapEmbed(raw?: string | null): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null

  const fromIframe = v.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1]?.trim()
  const candidate = (fromIframe || v).trim()

  // Sentences / pasted body text are not map URLs
  if (!fromIframe && (/\s/.test(candidate) || candidate.length > 500)) return null

  try {
    const u = new URL(candidate)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const host = u.hostname.toLowerCase()
    const href = u.toString().toLowerCase()
    const looksLikeMap =
      host.includes('google.') ||
      host.includes('googleapis.com') ||
      host.includes('openstreetmap.org') ||
      host.includes('osm.org') ||
      host.includes('yandex.') ||
      host.includes('mapy.cz') ||
      host.includes('maps.apple.com') ||
      href.includes('/maps') ||
      href.includes('map=') ||
      href.includes('embed')
    return looksLikeMap ? u.toString() : null
  } catch {
    return null
  }
}
