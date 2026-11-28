import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { reviewsApi } from '@gaido/api-client/api/reviews'
import { ReviewQuote } from '../components/HomeReviews'
import AllReviewPhotos from '../components/reviews/AllReviewPhotos'
import { Seo } from '../lib/seo'
import { reviewsSchema } from '../lib/reviewsSchema'

export default function AllReviewsPage() {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['reviews', 'all'], queryFn: ({ pageParam }) => reviewsApi.list({ limit: 12, offset: pageParam }),
    initialPageParam: 0, getNextPageParam: (page) => page.offset + page.items.length < page.total && page.items.length ? page.offset + page.items.length : undefined,
  })
  const items = data?.pages.flatMap(page => page.items) ?? []
  const first = data?.pages[0]
  return <>
    <Seo title="Відгуки мандрівників про екскурсії | Gaido UA" description="Відгуки та фото мандрівників про екскурсії українською на Gaido UA." path="/reviews" jsonLd={reviewsSchema(items, '/reviews')} />
    <main className="container-site py-10">
      <Link to="/" className="text-brand-700 hover:underline">← На головну</Link>
      <h1 className="font-display mt-5 text-3xl font-bold text-stone-900 md:text-4xl">Відгуки мандрівників</h1>
      <p className="mt-2 text-stone-500">Фото та враження від екскурсій</p>
      {first && <p className="mt-2 text-muted">{first.total} відгуків{first.rating_count ? <> · <span className="text-[#ffe72f]" aria-hidden="true">★</span> {first.rating_avg?.toFixed(1)}</> : null}</p>}
      <div className="mt-8"><AllReviewPhotos /></div>
      <h2 className="font-display mb-5 text-2xl font-bold text-stone-900">Відгуки мандрівників</h2>
      {isLoading ? <p className="mt-8">Завантаження відгуків…</p> : isError ? <p className="mt-8">Не вдалося завантажити відгуки. Спробуйте пізніше.</p> : items.length === 0 ? <p className="mt-8">Поки немає відгуків.</p> : <div className="space-y-4">{items.map(review => <ReviewQuote key={review.id} review={review} full />)}</div>}
      {hasNextPage && <div className="mt-8 text-center"><button type="button" className="btn-secondary" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? 'Завантаження…' : 'Показати ще'}</button></div>}
    </main>
  </>
}
