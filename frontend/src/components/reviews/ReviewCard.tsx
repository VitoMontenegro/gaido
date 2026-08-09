import { useState } from 'react'
import ReviewReplyForm from './ReviewReplyForm'
import { renderStars, type Review } from './types'

export default function ReviewCard({
  review,
  canReply,
  onReplied,
  showExcursion = true,
}: {
  review: Review
  canReply: boolean
  onReplied: () => void
  showExcursion?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <li className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-stone-900">{review.author_name || 'Користувач'}</p>
        <p className="text-brand-700">{renderStars(review.rating)}</p>
      </div>
      {showExcursion && review.excursion_title && (
        <p className="mt-1 text-sm text-stone-500">Екскурсія: {review.excursion_title}</p>
      )}
      {review.text ? (
        <p className="mt-2 whitespace-pre-wrap leading-relaxed text-stone-700">{review.text}</p>
      ) : (
        <p className="mt-2 text-sm italic text-stone-500">Без коментаря</p>
      )}

      {(review.comments ?? []).length > 0 && (
        <ul className="mt-4 space-y-2 border-l-2 border-sand-200 pl-4">
          {(review.comments ?? []).map((c) => (
            <li key={c.id} className="text-sm">
              <p className="font-medium text-stone-800">
                {c.author_name || 'Користувач'}
                <span className="ml-2 font-normal text-stone-500">
                  {c.is_guide ? '· гід' : '· автор'}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-stone-700">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      {canReply && (
        <div className="mt-4">
          {!open ? (
            <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setOpen(true)}>
              Відповісти
            </button>
          ) : (
            <ReviewReplyForm
              reviewId={review.id}
              onCancel={() => setOpen(false)}
              onSuccess={() => { setOpen(false); onReplied() }}
            />
          )}
        </div>
      )}
    </li>
  )
}
