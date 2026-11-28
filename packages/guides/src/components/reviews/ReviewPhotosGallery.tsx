import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { reviewsApi } from '@gaido/api-client/api/reviews'
import { openImageGallery } from '../../lib/fancybox'

type Props = {
  excursionId?: number
  guideId?: number
  all?: boolean
  compact?: boolean
}

export default function ReviewPhotosGallery({ excursionId, guideId, all = false, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['review-photos', all ? 'all' : excursionId ? 'excursion' : 'guide', ...(all ? [] : [excursionId ?? guideId])],
    queryFn: ({ pageParam }) => reviewsApi.listPhotos({ excursion_id: excursionId, guide_id: guideId, limit: 24, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.items.length && last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined,
    enabled: all || !!(excursionId || guideId),
  })
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const items = data?.pages.flatMap((page) => page.items) ?? []
  const urls = items.map((item) => resolveMediaUrl(item.public_key))
  const total = data?.pages[0]?.total ?? 0
  if (isLoading || !items.length) return all && isError ? <p className="text-sm text-stone-500">Не вдалося завантажити фотографії.</p> : null

  const showAllTile = total > (compact ? 3 : 7)
  const preview = items.slice(0, compact ? (total > 10 ? 10 : 11) : showAllTile ? 7 : 8)
  return <section className="mb-8 min-w-0" aria-label="Фотографії мандрівників">
    <h3 className={compact ? "mb-3 text-base font-semibold text-stone-900" : "mb-3 text-xl font-bold text-stone-900"}>{compact ? "Фотографії мандрівників" : "Галерея фото мандрівників"}</h3>
    <div className={compact ? "grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-11" : "grid grid-cols-4 gap-2 sm:grid-cols-8"}>
      {preview.map((item, i) => <button key={`${item.review_id}-${item.public_key}-${i}`} type="button" onClick={() => openImageGallery(urls, i)} aria-label={`Відкрити фото ${i + 1}`} className={`${compact && i >= 3 ? i >= 7 ? "hidden lg:block" : "hidden sm:block" : ""} aspect-square overflow-hidden rounded-2xl bg-stone-100`}>
        <img src={urls[i]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-200 hover:scale-105" />
      </button>)}
      {showAllTile && <button type="button" onClick={() => setOpen(true)} aria-label={`Усі фото: ${total}`} className={`${compact && total <= 7 ? "sm:hidden" : compact && total <= 10 ? "lg:hidden" : ""} relative aspect-square overflow-hidden rounded-2xl bg-stone-800 text-white`}>
        <img src={urls[compact ? Math.min(10, urls.length - 1) : 7]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <span className="relative flex h-full flex-col items-center justify-center px-1 text-center"><strong className="text-lg sm:text-xl">{total} фото</strong><span className="mt-1 text-sm">Усі фото →</span></span>
      </button>}
    </div>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="review-photos-title" className="flex max-h-[90dvh] w-full max-w-5xl flex-col rounded-3xl bg-white p-5 shadow-xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id="review-photos-title" className="text-xl font-bold text-stone-900">Фото мандрівників · {total}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Закрити галерею" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-2xl text-stone-700">×</button></div>
        <div className="overflow-y-auto"><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">{items.map((item, i) => <button key={`${item.review_id}-${item.public_key}-${i}`} type="button" onClick={() => openImageGallery(urls, i)} aria-label={`Відкрити фото ${i + 1}`} className="aspect-square overflow-hidden rounded-xl bg-stone-100"><img src={urls[i]} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}</div>
          {hasNextPage && <div className="mt-5 text-center"><button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="btn-secondary">{isFetchingNextPage ? 'Завантаження…' : 'Показати ще фото'}</button></div>}
        </div>
      </div>
    </div>}
  </section>
}
