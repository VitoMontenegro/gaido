import { useEffect, useState } from 'react'
import { api } from '../api/http'

const STORAGE_KEY = 'recent_views'
const MAX_ITEMS = 8

export type RecentView = {
  type: 'excursion' | 'guide'
  slug: string
  title: string
  subtitle?: string
  description?: string
  price?: number
  currency?: string
  cover_url?: string
  rating_avg?: number
  rating_count?: number
}

function readViews(): RecentView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentView[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeViews(items: RecentView[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  window.dispatchEvent(new Event('recent-views-updated'))
}

export function trackRecentView(item: RecentView) {
  const items = readViews().filter((v) => !(v.type === item.type && v.slug === item.slug))
  writeViews([item, ...items])
}

export function removeRecentView(type: RecentView['type'], slug: string) {
  const items = readViews()
  const next = items.filter((v) => !(v.type === type && v.slug === slug))
  if (next.length !== items.length) writeViews(next)
}

/** Drop entries whose excursion/guide no longer exists in the catalog. */
export async function validateRecentViews(): Promise<RecentView[]> {
  const items = readViews()
  if (items.length === 0) return items

  const kept: RecentView[] = []
  for (const item of items) {
    try {
      if (item.type === 'excursion') {
        await api(`/api/v1/excursions/${encodeURIComponent(item.slug)}`)
      } else {
        await api(`/api/v1/guides/${encodeURIComponent(item.slug)}`)
      }
      kept.push(item)
    } catch {
      // removed from catalog
    }
  }
  if (kept.length !== items.length) writeViews(kept)
  return kept
}

export function useRecentViews(): RecentView[] {
  const [items, setItems] = useState<RecentView[]>(() => readViews())

  useEffect(() => {
    const refresh = () => setItems(readViews())
    refresh()
    window.addEventListener('recent-views-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('recent-views-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return items
}
