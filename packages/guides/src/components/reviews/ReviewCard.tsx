import { useState } from 'react'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import ImageLightbox from './ImageLightbox'
import ReviewDisputeForm from './ReviewDisputeForm'
import ReviewReplyForm from './ReviewReplyForm'
import StarRating from './StarRating'
import { formatReviewDate, type Review } from './types'

export default function ReviewCard({
  review,
  canReply,
  canDispute = false,
  onReplied,
  onDisputed,
  showExcursion = true,
}: {
  review: Review
  canReply: boolean
  canDispute?: boolean
  onReplied: () => void
  onDisputed?: () => void
  showExcursion?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)

  const photoUrls = (review.photos ?? []).map(resolveMediaUrl).filter(Boolean)
  const dateLabel = formatReviewDate(review.created_at)
  const text = review.text?.trim() ?? ''
  const isLong = text.length > 320
  const displayText = !isLong || expanded ? text : `${text.slice(0, 320).trim()}…`

  return (
    <li className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-stone-900">{review.author_name || 'Користувач'}</p>
          {dateLabel && <p className="mt-0.5 text-sm text-stone-500">{dateLabel}</p>}
        </div>
        <StarRating value={review.rating} size="md" ariaLabel={`Оцінка ${review.rating}`} />
      </div>

      {showExcursion && review.excursion_title && (
        <p className="mt-2 text-sm text-stone-500">Екскурсія: {review.excursion_title}</p>
      )}

      {text ? (
        <div className="mt-3">
          <p className="whitespace-pre-wrap leading-relaxed text-stone-700">{displayText}</p>
          {isLong && (
            <button
              type="button"
              className="mt-1 text-sm font-medium text-teal hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Згорнути' : 'Читати повністю'}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm italic text-stone-500">Без коментаря</p>
      )}

      {photoUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {photoUrls.map((src, i) => (
            <button
              key={`${review.id}-${i}`}
              type="button"
              className="h-16 w-16 overflow-hidden rounded-lg border border-stone-200 sm:h-20 sm:w-20"
              onClick={() => setLightbox(i)}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {(review.comments ?? []).length > 0 && (
        <ul className="mt-4 space-y-3 border-l-2 border-brand-100 pl-4">
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

      {canDispute && review.dispute && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <p className="font-medium text-amber-900">Оскарження на розгляді</p>
          <p className="mt-1 whitespace-pre-wrap text-amber-800">{review.dispute.text}</p>
        </div>
      )}

      {canReply && (
        <div className="mt-4">
          {!open ? (
            <button
              type="button"
              className="text-sm font-medium text-teal hover:underline"
              onClick={() => setOpen(true)}
            >
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

      {canDispute && !review.dispute && (
        <div className="mt-4">
          {!disputeOpen ? (
            <button
              type="button"
              className="text-sm font-medium text-amber-700 hover:underline"
              onClick={() => setDisputeOpen(true)}
            >
              Оскаржити відгук
            </button>
          ) : (
            <ReviewDisputeForm
              reviewId={review.id}
              onCancel={() => setDisputeOpen(false)}
              onSuccess={() => { setDisputeOpen(false); onDisputed?.() }}
            />
          )}
        </div>
      )}

      {lightbox !== null && (
        <ImageLightbox
          urls={photoUrls}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
        />
      )}
    </li>
  )
}
