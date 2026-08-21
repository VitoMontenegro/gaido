import type { FavoriteRef } from '@gaido/api-client/api/reviews'

export const GUEST_FAVORITES_KEY = 'gaido_favorites'
export const GUEST_FAVORITES_EVENT = 'favorites-updated'
const MAX_ITEMS = 50

function isFavoriteRef(value: unknown): value is FavoriteRef {
  if (!value || typeof value !== 'object') return false
  const item = value as FavoriteRef
  return Number.isFinite(item.target_id) && item.target_id > 0
}

export function favoriteKey(item: FavoriteRef) {
  return `${item.target_type}:${item.target_id}`
}

export function readGuestFavorites(): FavoriteRef[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const out: FavoriteRef[] = []
    for (const item of parsed) {
      if (!isFavoriteRef(item)) continue
      const key = favoriteKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ target_type: item.target_type, target_id: item.target_id })
    }
    return out.slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

function writeGuestFavorites(items: FavoriteRef[]) {
  localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  window.dispatchEvent(new Event(GUEST_FAVORITES_EVENT))
}

export function isGuestFavorited(targetType: string, targetId: number) {
  return readGuestFavorites().some((item) => item.target_type === targetType && item.target_id === targetId)
}

export function toggleGuestFavorite(item: FavoriteRef): boolean {
  const items = readGuestFavorites()
  const exists = items.some((f) => f.target_type === item.target_type && f.target_id === item.target_id)
  if (exists) {
    writeGuestFavorites(items.filter((f) => !(f.target_type === item.target_type && f.target_id === item.target_id)))
    return false
  }
  writeGuestFavorites([{ target_type: item.target_type, target_id: item.target_id }, ...items])
  return true
}

export function clearGuestFavorites() {
  if (readGuestFavorites().length === 0) return
  localStorage.removeItem(GUEST_FAVORITES_KEY)
  window.dispatchEvent(new Event(GUEST_FAVORITES_EVENT))
}
