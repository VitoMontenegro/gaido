import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type NotificationItem } from '../api/notifications'
import { useMe } from './useAuth'

export function useNotifications() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const cursorRef = useRef(0)

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationsApi.list()
      const items = res.items ?? []
      if (items.length) {
        cursorRef.current = Math.max(...items.map((n) => n.id), cursorRef.current)
      }
      return items
    },
    enabled: !!me,
    staleTime: 15_000,
  })

  useEffect(() => {
    if (!me) return
    const ac = new AbortController()
    let alive = true

    const loop = async () => {
      while (alive) {
        try {
          const res = await notificationsApi.longpoll(cursorRef.current, 25, ac.signal)
          const items = res.items ?? []
          if (items.length) {
            cursorRef.current = Math.max(...items.map((n) => n.id), cursorRef.current)
            qc.setQueryData<NotificationItem[]>(['notifications'], (prev) => {
              const map = new Map((prev ?? []).map((n) => [n.id, n]))
              for (const n of items) map.set(n.id, n)
              return [...map.values()].sort((a, b) => b.id - a.id)
            })
          }
        } catch {
          if (!alive || ac.signal.aborted) return
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    }
    void loop()
    return () => {
      alive = false
      ac.abort()
    }
  }, [me, qc])

  const unread = (query.data ?? []).filter((n) => !n.read_at).length

  return { ...query, unread }
}
