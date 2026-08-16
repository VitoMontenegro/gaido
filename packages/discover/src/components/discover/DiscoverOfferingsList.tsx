import { useEffect, useMemo, useState } from 'react'
import type { DiscoverOffering } from '@gaido/api-client/api/types/discover'
import OfferingCard from './OfferingCard'

const DEFAULT_PAGE_SIZE = 12

type Props = {
  items: DiscoverOffering[]
  compact?: boolean
  title?: string
  pageSize?: number
  emptyMessage?: string
}

export default function DiscoverOfferingsList({
  items,
  compact = false,
  title = 'Пропозиції',
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = 'Пропозицій не знайдено.',
}: Props) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  const listKey = useMemo(
    () => items.map((item) => item.id).join(','),
    [items],
  )

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [listKey, pageSize])

  const visibleItems = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length
  const remaining = items.length - visibleCount

  if (items.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>
  }

  return (
    <section className="discover-offerings-panel space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title-sm">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            Показано {visibleItems.length} з {items.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <OfferingCard key={item.id} item={item} compact={compact} />
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary min-w-[220px]"
            onClick={() => setVisibleCount((count) => Math.min(count + pageSize, items.length))}
          >
            Показати ще {Math.min(pageSize, remaining)}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-teal transition hover:underline"
            onClick={() => setVisibleCount(items.length)}
          >
            Показати всі ({items.length})
          </button>
        </div>
      )}
    </section>
  )
}
