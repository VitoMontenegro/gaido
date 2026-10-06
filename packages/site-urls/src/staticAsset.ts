import { getBuildIdEnv } from './env'

/** Git short SHA or "dev" — set via NEXT_PUBLIC_BUILD_ID / VITE_BUILD_ID. */
const BUILD_ID = getBuildIdEnv()

/** Static files live at apex `/fonts`, `/images` (unified Next). */
export function staticAssetUrl(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  if (!path.startsWith('/')) return path
  if (path.startsWith('/assets/') || path.startsWith('/_next/')) return path
  if (!path.startsWith('/images/') && !path.startsWith('/fonts/')) return path
  if (/[?&]v=/.test(path)) return path
  if (!BUILD_ID || BUILD_ID === 'dev') return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}v=${BUILD_ID}`
}

export function getBuildId() {
  return BUILD_ID
}
