import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { forumsApi, type ForumTopicResponse } from '../api/forums'

export function useForumTopic(topicId: number) {
  const qc = useQueryClient()
  const cursorRef = useRef(0)

  const query = useQuery({
    queryKey: ['forum-topic', topicId],
    queryFn: () => forumsApi.getTopic(topicId),
    enabled: topicId > 0,
  })

  useEffect(() => {
    const items = query.data?.items ?? []
    if (items.length) {
      cursorRef.current = Math.max(...items.map((p) => p.id), cursorRef.current)
    }
  }, [query.data])

  useEffect(() => {
    if (topicId <= 0 || !query.isSuccess) return
    const ac = new AbortController()
    let alive = true

    const loop = async () => {
      while (alive) {
        try {
          const res = await forumsApi.longpoll(topicId, cursorRef.current, 25, ac.signal)
          const items = res.items ?? []
          if (items.length) {
            cursorRef.current = Math.max(...items.map((p) => p.id), cursorRef.current)
            qc.setQueryData<ForumTopicResponse>(['forum-topic', topicId], (prev) => {
              if (!prev) return prev
              const map = new Map(prev.items.map((p) => [p.id, p]))
              for (const p of items) map.set(p.id, p)
              return { ...prev, items: [...map.values()].sort((a, b) => a.id - b.id) }
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
  }, [topicId, query.isSuccess, qc])

  return query
}
