/** Exact host allowlist for map embeds (https only). */
const MAP_HOSTS = new Set([
  'www.google.com',
  'maps.google.com',
  'maps.googleapis.com',
  'www.google.com.ua',
  'www.openstreetmap.org',
  'openstreetmap.org',
  'www.osm.org',
  'osm.org',
  'yandex.ru',
  'yandex.ua',
  'yandex.com',
  'www.yandex.ru',
  'www.yandex.ua',
  'www.yandex.com',
  'mapy.cz',
  'www.mapy.cz',
  'maps.apple.com',
])

function isAllowedMapHost(host: string): boolean {
  return MAP_HOSTS.has(host.toLowerCase())
}

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
    if (u.protocol !== 'https:') return null
    if (!isAllowedMapHost(u.hostname)) return null
    return u.toString()
  } catch {
    return null
  }
}
