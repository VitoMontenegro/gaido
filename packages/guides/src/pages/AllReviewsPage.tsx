import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { reviewsApi } from '@gaido/api-client/api/reviews'
import { ReviewQuote } from '../components/HomeReviews'
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
      <h1 className="section-title mt-5">Відгуки мандрівників</h1>
      {first && <p className="mt-2 text-muted">{first.total} відгуків{first.rating_count ? ` · ★ ${first.rating_avg?.toFixed(1)}` : ''}</p>}
      {isLoading ? <p className="mt-8">Завантаження відгуків…</p> : isError ? <p className="mt-8">Не вдалося завантажити відгуки. Спробуйте пізніше.</p> : items.length === 0 ? <p className="mt-8">Поки немає відгуків.</p> : <div className="mt-8 flex flex-wrap justify-center gap-4">{items.map(review => <div key={review.id} className="w-full md:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"><ReviewQuote review={review} full /></div>)}</div>}
      {hasNextPage && <div className="mt-8 text-center"><button type="button" className="btn-secondary" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? 'Завантаження…' : 'Показати ще'}</button></div>}
    </main>
  </>
}
