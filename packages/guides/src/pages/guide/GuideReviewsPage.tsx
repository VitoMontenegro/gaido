import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@gaido/api-client/api/client'
import { reviewsApi } from '@gaido/api-client/api/reviews'
import ReviewCard from '../../components/reviews/ReviewCard'
import type { GuideProfile } from './shared'

export function GuideReviewsPage() {
  const qc = useQueryClient()
  const profile = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const guideId = profile.data?.id
  const reviews = useQuery({
    queryKey: ['reviews', 'guide', guideId],
    queryFn: () => reviewsApi.list({ guide_id: guideId, limit: 50, offset: 0 }),
    enabled: !!guideId,
  })
  const items = reviews.data?.items ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Відгуки</h2>
        <p className="mt-1 text-sm text-stone-600">Відгуки мандрівників про ваші екскурсії. Можна відповісти або оскаржити.</p>
      </div>
      {reviews.isLoading && <p className="card text-sm text-stone-500">Завантаження…</p>}
      {!reviews.isLoading && items.length === 0 && (
        <p className="card text-sm text-stone-600">Поки немає відгуків.</p>
      )}
      <ul className="space-y-3">
        {items.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            canReply
            canDispute
            onReplied={() => void qc.invalidateQueries({ queryKey: ['reviews', 'guide', guideId] })}
            onDisputed={() => void qc.invalidateQueries({ queryKey: ['reviews', 'guide', guideId] })}
          />
        ))}
      </ul>
    </div>
  )
}
