import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExcursionItem } from '../excursionUi'
import { reviewsApi, REVIEWS_PAGE_SIZE } from '../../api/reviews'
import ReviewCard from './ReviewCard'
import ReviewForm from './ReviewForm'
import ReviewPhotosGallery from './ReviewPhotosGallery'
import type { Review } from './types'

type Props = {
  excursionId?: number
  guideId?: number
  fixedExcursionId?: number
  excursions?: ExcursionItem[]
  canReply: (review: Review) => boolean
  canDispute?: (review: Review) => boolean
  showExcursion?: boolean
  invalidateKeys: unknown[][]
  className?: string
}

export default function ReviewsSection({
  excursionId,
  guideId,
  fixedExcursionId,
  excursions,
  canReply,
  canDispute,
  showExcursion = true,
  invalidateKeys,
  className,
}: Props) {
  const qc = useQueryClient()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['reviews', excursionId ? 'excursion' : 'guide', excursionId ?? guideId],
    queryFn: ({ pageParam = 0 }) =>
      reviewsApi.list({
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

  const reviewMutation = useMutation({
    mutationFn: reviewsApi.create,
    onSuccess: () => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key })
      }
      qc.invalidateQueries({
        queryKey: ['review-photos', excursionId ? 'excursion' : 'guide', excursionId ?? guideId],
      })
    },
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0
  const remaining = total - items.length

  const invalidateReviews = () => {
    for (const key of invalidateKeys) {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  return (
    <section id="reviews" className={className ?? 'scroll-mt-28'}>
      <h2 className="excursion-parus-section__title mb-4 font-display text-2xl font-bold">Відгуки</h2>
      <div className="space-y-4">
        <ReviewForm
          excursions={excursions}
          fixedExcursionId={fixedExcursionId}
          submitting={reviewMutation.isPending}
          error={reviewMutation.error}
          success={reviewMutation.isSuccess}
          onSubmit={(v) => reviewMutation.mutate(v)}
        />

        <ReviewPhotosGallery excursionId={excursionId} guideId={guideId} />

        {isLoading ? (
          <p className="excursion-parus-muted text-sm">Завантаження відгуків…</p>
        ) : items.length === 0 ? (
          <p className="excursion-parus-muted">Поки немає відгуків. Будьте першим!</p>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  showExcursion={showExcursion}
                  canReply={canReply(r)}
                  canDispute={canDispute?.(r) ?? false}
                  onReplied={invalidateReviews}
                  onDisputed={invalidateReviews}
                />
              ))}
            </ul>
            {hasNextPage && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  className="btn-secondary px-6"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage
                    ? 'Завантаження…'
                    : remaining > 0
                      ? `Показати ще ${Math.min(remaining, REVIEWS_PAGE_SIZE)}`
                      : 'Показати ще'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
