import { useEffect, useState } from 'react'

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
