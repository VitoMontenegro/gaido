import { useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { reviewsApi, REVIEWS_PAGE_SIZE } from '@gaido/api-client/api/reviews'
import { useDragScroll } from '../../hooks/useDragScroll'
import { openImageGallery } from '../../lib/fancybox'

type Props = {
  excursionId?: number
  guideId?: number
}

export default function ReviewPhotosGallery({ excursionId, guideId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { consumeDragClick } = useDragScroll(scrollRef)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['review-photos', excursionId ? 'excursion' : 'guide', excursionId ?? guideId],
    queryFn: ({ pageParam = 0 }) =>
      reviewsApi.listPhotos({
        excursion_id: excursionId,
        guide_id: guideId,
        limit: REVIEWS_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length
      return next < last.total ? next : undefined
    },
    enabled: !!(excursionId || guideId),
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0
  const urls = items.map((i) => resolveMediaUrl(i.public_key)).filter(Boolean)

  if (isLoading || urls.length === 0) return null

  const remaining = total - items.length

  return (
    <div className="mb-6 min-w-0">
      <h3 className="mb-3 text-lg font-semibold text-stone-900">Галерея фото туристів</h3>
      <div
        ref={scrollRef}
        className="cursor-grab overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex snap-x snap-mandatory gap-2">
          {urls.map((src, i) => (
            <button
              key={`${items[i]?.public_key}-${i}`}
              type="button"
              className="h-20 w-20 shrink-0 snap-start overflow-hidden rounded-xl border border-stone-200 bg-stone-100 transition hover:opacity-90 sm:h-24 sm:w-24"
              onClick={() => {
                if (consumeDragClick()) return
                openImageGallery(urls, i)
              }}
            >
              <img src={src} alt="" className="pointer-events-none h-full w-full object-cover" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      </div>
      {hasNextPage && (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-teal hover:underline disabled:opacity-60"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage
            ? 'Завантаження…'
            : remaining > 0
              ? `Показати ще ${Math.min(remaining, REVIEWS_PAGE_SIZE)} фото`
              : 'Показати ще'}
        </button>
      )}
    </div>
  )
}
