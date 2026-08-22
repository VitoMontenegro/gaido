/** Git short SHA or "dev" — set in deploy via VITE_BUILD_ID for cache busting of /images and /fonts. */
const BUILD_ID = (import.meta.env.VITE_BUILD_ID as string | undefined) || 'dev'

/** Vite-hashed bundles under /assets/ — do not add query params. */
export function staticAssetUrl(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  if (!path.startsWith('/')) return path
  if (path.startsWith('/assets/')) return path
  if (!path.startsWith('/images/') && !path.startsWith('/fonts/')) return path
  if (/[?&]v=/.test(path)) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}v=${BUILD_ID}`
}

export function getBuildId() {
  return BUILD_ID
}
