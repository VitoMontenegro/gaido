import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import type { Review, ReviewComment } from '@gaido/api-client/api/types/reviews'
import { openImageGallery } from '../lib/fancybox'
import GuideAvatar from './GuideAvatar'
import AllReviewPhotos from './reviews/AllReviewPhotos'
import StarRating from './reviews/StarRating'
import { formatReviewDate } from './reviews/types'

function ReviewResponse({ comment }: { comment: ReviewComment }) {
  const [expanded, setExpanded] = useState(false)
  const long = comment.text.length > 300
  return <div>
    <p className="mb-3 text-base font-bold text-stone-900">{comment.is_guide ? 'Відповідь гіда' : `Коментар: ${comment.author_name || 'Мандрівник'}`}</p>
    <div className="rounded-2xl bg-white p-4">
      <p className={`whitespace-pre-wrap text-sm leading-relaxed text-stone-700 ${long && !expanded ? 'line-clamp-4' : ''}`}>{comment.text}</p>
      {long && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-800 hover:bg-stone-200">{expanded ? 'Згорнути ↑' : 'Читати повністю ↓'}</button>}
    </div>
  </div>
}

export function ReviewQuote({ review, full = false }: { review: Review; full?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const text = review.text?.trim() || ''
  const photos = (review.photos ?? []).map(resolveMediaUrl).filter(Boolean)
  const date = formatReviewDate(review.created_at)
  const excursionUrl = review.excursion_slug ? `/excursion/${review.excursion_slug}` : ''
  const long = text.length > (full ? 450 : 220)
  const displayedText = long && !expanded ? `${text.slice(0, full ? 450 : 220).trim()}…` : text

  const header = <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-bold text-stone-900">{review.author_name?.trim() || 'Мандрівник'}</span>{date && <time className="text-xs text-stone-500" dateTime={review.created_at}>{date}</time>}</div>
  const content = <>
    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{displayedText || 'Без коментаря'}</p>
    {long && <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-medium text-teal hover:underline">{expanded ? 'Згорнути' : 'Читати повністю'}</button>}
  </>
  const photoButtons = photos.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{photos.map((src, i) => <button key={`${src}-${i}`} type="button" aria-label={`Відкрити фото ${i + 1} до відгуку`} onClick={() => openImageGallery(photos, i)} className="h-20 w-20 overflow-hidden rounded-xl bg-stone-100"><img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}</div>

  if (full) return <article className="overflow-hidden rounded-3xl bg-white shadow-[0_3px_24px_rgba(0,0,0,0.06)]">
    <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="p-3 sm:p-5">{header}{content}{photoButtons}</div>
      <aside className="rounded-2xl bg-stone-50 p-5">
        <p className="mb-2 text-xs font-semibold text-stone-700">Оцінка</p>
        <div className="flex items-center gap-2"><StarRating value={review.rating} size="sm" /><span className="text-sm text-stone-500">({review.rating.toFixed(1)})</span></div>
        {excursionUrl && review.excursion_title && <div className="mt-5"><p className="mb-1 text-xs font-semibold text-stone-700">Екскурсія</p><Link to={excursionUrl} className="text-sm font-medium text-teal underline underline-offset-2">{review.excursion_title}</Link></div>}
        {review.guide_name && <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-stone-700">Гід</p>
          <div className="flex items-center justify-between gap-3">
            {review.guide_slug ? <Link to={`/guide/${review.guide_slug}`} className="font-semibold text-stone-900 hover:text-teal hover:underline">{review.guide_name}</Link> : <span className="font-semibold text-stone-900">{review.guide_name}</span>}
            <GuideAvatar avatar={review.guide_avatar_url} name={review.guide_name} className="h-12 w-12 shrink-0 rounded-xl" />
          </div>
        </div>}
      </aside>
    </div>
    {!!review.comments?.length && <div className="space-y-5 bg-stone-100/80 p-5 sm:px-7 sm:py-6">{review.comments.map(comment => <ReviewResponse key={comment.id} comment={comment} />)}</div>}
  </article>

  return <article className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_3px_24px_rgba(0,0,0,0.07)]">
    <div className="flex items-start justify-between gap-2">{header}{photos.length > 0 && <button type="button" onClick={() => openImageGallery(photos)} className="shrink-0 rounded-full bg-teal px-2 py-1 text-xs font-semibold text-white">{photos.length} фото</button>}</div>
    <div className="mt-3"><StarRating value={review.rating} size="sm" /></div>
    {content}
    {excursionUrl && review.excursion_title && <Link to={excursionUrl} className="mt-3 inline-block text-xs font-medium text-teal hover:underline">{review.excursion_title} →</Link>}
  </article>
}

export default function HomeReviews({ reviews, ratingAvg, ratingCount }: { reviews: Review[]; ratingAvg: number; ratingCount: number }) {
  if (!reviews.length) return null
  return <section className="container-site py-14" aria-labelledby="home-reviews-title">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div><h2 id="home-reviews-title" className="font-display text-2xl font-bold text-stone-900 md:text-[28px]">Відгуки мандрівників</h2>{ratingCount > 0 && <p className="mt-1 text-sm text-stone-500"><span className="text-[#ffe72f]" aria-hidden="true">★</span> {ratingAvg.toFixed(1)} · {ratingCount} відгуків</p>}</div>
      <Link to="/reviews" className="inline-flex items-center rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-dark">Усі відгуки <span aria-hidden className="ml-2">→</span></Link>
    </div>
    <AllReviewPhotos compact />
    <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">{reviews.slice(0, 6).map(review => <ReviewQuote key={review.id} review={review} />)}</div>
  </section>
}
