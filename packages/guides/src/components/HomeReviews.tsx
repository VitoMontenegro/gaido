import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { openImageGallery } from '../lib/fancybox'
import type { Review } from '@gaido/api-client/api/types/reviews'
import StarRating from './reviews/StarRating'
import { formatReviewDate } from './reviews/types'

function reviewsWord(count: number) {
  const n10 = count % 10
  const n100 = count % 100
  if (n10 === 1 && n100 !== 11) return 'відгук'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'відгуки'
  return 'відгуків'
}

export function ReviewQuote({ review, full = false }: { review: Review; full?: boolean }) {
  const text = review.text.trim()
  const photos = (review.photos ?? []).map(resolveMediaUrl).filter(Boolean)
  const dateLabel = formatReviewDate(review.created_at)
  const excursionUrl = review.excursion_slug ? `/excursion/${review.excursion_slug}` : ''

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-divider bg-surface p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] md:p-6">
      <StarRating value={review.rating} size="sm" ariaLabel={`Оцінка ${review.rating} з 5`} />
      <p className={`mt-4 flex-1 whitespace-pre-wrap text-base leading-relaxed text-ink ${full ? "" : "line-clamp-5"}`}>{text || "Без коментаря"}</p>
      {photos.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{photos.map((src, i) => <button key={src} type="button" aria-label={`Відкрити фото ${i + 1} до відгуку`} className="h-24 w-24 overflow-hidden rounded-xl" onClick={() => openImageGallery(photos, i)}><img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}</div>}
      <div className="mt-5 border-t border-divider pt-4">
        <p className="font-medium text-ink">{review.author_name?.trim() || 'Мандрівник'}</p>
        {dateLabel && <p className="mt-0.5 text-sm text-muted">{dateLabel}</p>}
        {excursionUrl && review.excursion_title && (
          <Link to={excursionUrl} className="link-accent mt-2 inline-block text-sm normal-case">
            {review.excursion_title}
          </Link>
        )}
      </div>
    </article>
  )
}

export default function HomeReviews({
  reviews,
  ratingAvg,
  ratingCount,
}: {
  reviews: Review[]
  ratingAvg: number
  ratingCount: number
}) {
  if (reviews.length === 0) return null

  const summary = ratingCount > 0 && ratingAvg > 0
    ? (
        <div className="flex items-center gap-3">
          <p className="font-display text-4xl font-medium leading-none text-ink">{ratingAvg.toFixed(1)}</p>
          <div>
            <StarRating value={ratingAvg} size="sm" />
            <p className="mt-1 text-sm text-muted">{ratingCount} {reviewsWord(ratingCount)}</p>
          </div>
        </div>
      )
    : null

  return (
    <section className="container-site py-14" aria-labelledby="home-reviews-title">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="home-reviews-title" className="section-title">Відгуки мандрівників</h2>
          <p className="mt-2 text-base text-muted">Що кажуть після екскурсій</p>
        </div>
        {summary}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {reviews.map((review) => (
          <div key={review.id} className="w-full md:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
            <ReviewQuote review={review} />
          </div>
        ))}
      </div>
      <div className="mt-8 text-center"><Link to="/reviews" className="btn-secondary inline-flex">Усі відгуки →</Link></div>
    </section>
  )
}
