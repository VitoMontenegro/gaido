import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { reviewsApi } from '../api/reviews'
import type { ExcursionItem } from '../components/excursionUi'
import {
  excursionTypeLabel,
  formatPrice,
} from '../components/excursionUi'
import BookingTermsSection from '../components/BookingTermsSection'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCover from '../components/ExcursionCover'
import ExcursionDetailsGrid from '../components/ExcursionDetailsGrid'
import GuideAvatar from '../components/GuideAvatar'
import ReviewCard from '../components/reviews/ReviewCard'
import ReviewForm from '../components/reviews/ReviewForm'
import { renderStars, type Review } from '../components/reviews/types'
import { trackRecentView } from '../hooks/useRecentViews'
import { useHasRole, useMe } from '../hooks/useAuth'
import { resolveMapEmbed } from '../lib/mapEmbed'
import { pageTitle } from '../lib/brand'
import { Seo } from '../lib/seo'
import { sanitizeHtml } from '../lib/html'

type TabId = 'program' | 'reviews' | 'details'

function ExcursionBookingPanel({
  excursion,
  favMutation,
  compact = false,
}: {
  excursion: ExcursionItem
  favMutation: ReturnType<typeof useMutation<{ favorited: boolean }, Error, void>>
  compact?: boolean
}) {
  return (
    <>
      <div className={compact ? 'min-w-0 flex-1' : undefined}>
        <p className={`font-display font-bold text-brand-700 ${compact ? 'text-xl leading-tight' : 'text-3xl'}`}>
          {formatPrice(excursion.price_from, excursion.currency)}
        </p>
        <p className={`text-stone-500 ${compact ? 'truncate text-xs' : 'text-sm'}`}>
          за групу / формат {excursionTypeLabel(excursion.type).toLowerCase()}
        </p>
      </div>
      <div className={compact ? 'flex shrink-0 items-center gap-2' : 'space-y-4'}>
        {excursion.guide_slug && (
          <Link
            to={`/guide/${excursion.guide_slug}`}
            className={`btn-primary text-center ${compact ? 'px-4 py-2.5 text-sm whitespace-nowrap' : 'block w-full'}`}
          >
            Написати гіду
          </Link>
        )}
        {!compact && (
          <>
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={favMutation.isPending}
              onClick={() => favMutation.mutate()}
            >
              {favMutation.data?.favorited ? 'В обраному' : 'В обране'}
            </button>
            {favMutation.isError && (
              <p className="text-xs text-red-600">Увійдіть, щоб додати до обраного</p>
            )}
            <div className="border-t border-stone-100 pt-3 text-sm text-stone-600">
              <p className="font-medium text-stone-800">Як це працює</p>
              <p className="mt-1">Звʼяжіться з гідом напряму — бронювання та оплата поза платформою.</p>
            </div>
          </>
        )}
        {compact && (
          <button
            type="button"
            className="btn-secondary px-3 py-2.5 text-sm"
            disabled={favMutation.isPending}
            aria-label={favMutation.data?.favorited ? 'В обраному' : 'В обране'}
            onClick={() => favMutation.mutate()}
          >
            {favMutation.data?.favorited ? '♥' : '♡'}
          </button>
        )}
      </div>
    </>
  )
}

export default function ExcursionPage() {
  const { slug = '' } = useParams()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const isGuideRole = useHasRole('ROLE_GUIDE')
  const [tab, setTab] = useState<TabId>('program')
  const sectionRef = useRef<HTMLElement>(null)

  const selectTab = (id: TabId) => {
    setTab(id)
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const { data: excursion, isLoading } = useQuery({
    queryKey: ['excursion', slug],
    queryFn: () => api<ExcursionItem>(`/api/v1/excursions/${slug}`),
  })
  const { data: myGuide } = useQuery({
    queryKey: ['my-guide-profile'],
    queryFn: () => api<{ id: number }>('/api/v1/account/guide/profile'),
    enabled: isGuideRole,
  })
  const { data: reviews } = useQuery({
    queryKey: ['reviews', 'excursion', excursion?.id],
    queryFn: () => api<{ items: Review[] }>(`/api/v1/reviews?excursion_id=${excursion!.id}`),
    enabled: !!excursion?.id,
  })

  const reviewMutation = useMutation({
    mutationFn: (body: { excursion_id: number; rating: number; text: string }) =>
      reviewsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', 'excursion', excursion?.id] })
      qc.invalidateQueries({ queryKey: ['excursion', slug] })
    },
  })

  const favMutation = useMutation({
    mutationFn: () =>
      api<{ favorited: boolean }>('/api/v1/favorites', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'EXCURSION', target_id: excursion!.id }),
      }),
  })

  useEffect(() => {
    if (!excursion) return
    trackRecentView({
      type: 'excursion',
      slug: excursion.slug,
      title: excursion.title,
      subtitle: excursion.city_name,
      description: excursion.description,
      price: excursion.price_from,
      currency: excursion.currency,
      cover_url: excursion.cover_image_url,
      rating_avg: excursion.rating_avg,
      rating_count: excursion.rating_count,
    })
  }, [excursion])

  if (isLoading) return <div className="p-8">Завантаження...</div>
  if (!excursion) return <div className="p-8">Екскурсію не знайдено</div>

  const duration = excursion.duration_minutes ?? 180
  const transport = excursion.transport_mode ?? 'WALKING'
  const language = excursion.language ?? 'uk'
  const ratingAvg = excursion.rating_avg ?? 0
  const reviewItems = reviews?.items ?? []
  const ratingCount = excursion.rating_count ?? reviewItems.length
  const isGuideOwner = !!myGuide && myGuide.id === excursion.guide_id
  const body = excursion.body_html?.trim() || (excursion.description ? `<p>${excursion.description}</p>` : '')
  const mapUrl = resolveMapEmbed(excursion.map_embed_url)
  const hasBooking =
    (excursion.included_items?.length ?? 0) > 0 ||
    (excursion.excluded_items?.length ?? 0) > 0 ||
    !!excursion.organizational_details?.trim() ||
    !!excursion.meeting_point?.trim()

  return (
    <>
      <Seo
        title={pageTitle(excursion.title)}
        description={excursion.description ?? ''}
        path={`/excursion/${excursion.slug}`}
        image={excursion.cover_image_url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name: excursion.title,
          description: excursion.description,
          image: excursion.cover_image_url,
          url: `/excursion/${excursion.slug}`,
        }}
      />

      <Breadcrumbs
        items={[
          { label: 'Екскурсії', to: '/search' },
          ...(excursion.city_name
            ? [{
                label: excursion.city_name,
                ...(excursion.city_slug ? { to: `/city/${excursion.city_slug}` } : {}),
              }]
            : []),
          { label: excursion.title },
        ]}
      />

      <ExcursionCover
        cover={excursion.cover_image_url}
        title={excursion.title}
        className={
          excursion.cover_image_url?.trim()
            ? 'aspect-[16/9] w-full max-h-[420px]'
            : 'aspect-[21/9] w-full max-h-[220px] border-b border-divider'
        }
      />

      <div className="container-site grid gap-8 py-8 pb-28 lg:grid-cols-[1fr_340px] lg:pb-8">
        <div>
          {ratingCount > 0 && (
            <button
              type="button"
              className="mb-3 text-sm font-medium text-brand-700"
              onClick={() => selectTab('reviews')}
            >
              {renderStars(ratingAvg)} {ratingAvg.toFixed(1)} · {ratingCount} відгуків
            </button>
          )}

          <h1 className="font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">
            {excursion.title}
          </h1>
          {excursion.city_name && (
            <p className="mt-2 text-stone-600">{excursion.city_name}</p>
          )}

          <nav
            ref={sectionRef}
            role="tablist"
            aria-label="Розділи екскурсії"
            className="sticky top-[124px] z-30 -mx-5 mt-5 scroll-mt-[124px] border-b border-divider bg-page/95 px-5 py-3 backdrop-blur-sm lg:top-[70px] lg:mx-0 lg:scroll-mt-[105px]"
          >
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-200/70 p-1 shadow-sm ring-1 ring-border/60">
              {(
                [
                  ['program', 'Програма'],
                  ['reviews', 'Відгуки', ratingCount],
                  ['details', 'Умови'],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`flex min-h-11 items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition md:text-[15px] ${
                    tab === id
                      ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5'
                      : 'text-stone-600 hover:bg-white/60 hover:text-ink'
                  }`}
                  onClick={() => selectTab(id)}
                >
                  <span>{label}</span>
                  {typeof count === 'number' && count > 0 && (
                    <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-5 border-y border-stone-200 py-4">
            <ExcursionDetailsGrid
              type={excursion.type}
              maxGuests={excursion.max_guests}
              durationMinutes={duration}
              transportMode={transport}
              language={language}
              childrenAllowed={excursion.children_allowed}
            />
          </div>

          {tab === 'program' && (
            <section className="mt-6" role="tabpanel">
              <div
                className="excursion-body"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) || '<p>Опис зʼявиться незабаром.</p>' }}
              />
              {mapUrl && (
                <div className="mt-8">
                  <h2 className="font-display mb-3 text-xl font-bold normal-case tracking-normal">
                    Маршрут на карті
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-border bg-sand-50 shadow-sm">
                    <iframe
                      title="Маршрут екскурсії"
                      src={mapUrl}
                      className="aspect-video min-h-[280px] w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'reviews' && (
            <section className="mt-6 space-y-4" role="tabpanel">
              <ReviewForm
                fixedExcursionId={excursion.id}
                submitting={reviewMutation.isPending}
                error={reviewMutation.error}
                success={reviewMutation.isSuccess}
                onSubmit={(v) => reviewMutation.mutate(v)}
              />
              {reviewItems.length === 0 ? (
                <p className="text-sm text-stone-600">Поки немає відгуків. Будьте першим!</p>
              ) : (
                <ul className="space-y-3">
                  {reviewItems.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      showExcursion={false}
                      canReply={!!me && (isGuideOwner || me.id === r.author_id)}
                      onReplied={() => qc.invalidateQueries({ queryKey: ['reviews', 'excursion', excursion.id] })}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'details' && (
            <section className="mt-6" role="tabpanel">
              {hasBooking ? (
                <BookingTermsSection
                  className="mt-0 border-0 pt-0"
                  included={excursion.included_items}
                  excluded={excursion.excluded_items}
                  notesHtml={excursion.organizational_details}
                  meetingPoint={excursion.meeting_point}
                />
              ) : (
                <p className="text-sm text-muted">Гід ще не додав умови бронювання.</p>
              )}
            </section>
          )}

          {excursion.guide_slug && (
            <section className="mt-10">
              <h2 className="font-display mb-3 text-xl font-bold">Організатор</h2>
              <Link to={`/guide/${excursion.guide_slug}`} className="card inline-flex items-center gap-4 hover:shadow-md">
                <GuideAvatar
                  avatar={excursion.guide_avatar_url}
                  name={excursion.guide_name}
                  className="h-14 w-14 shrink-0 rounded-full"
                />
                <div>
                  <p className="font-semibold">{excursion.guide_name}</p>
                  <p className="text-sm text-brand-700">Профіль гіда →</p>
                </div>
              </Link>
            </section>
          )}
        </div>

        <aside className="hidden h-fit lg:block lg:sticky lg:top-[105px]">
          <div className="card space-y-4 border-brand-200 shadow-lg">
            <ExcursionBookingPanel excursion={excursion} favMutation={favMutation} />
          </div>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-page/95 px-5 py-3 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[1460px] items-center gap-3">
          <ExcursionBookingPanel excursion={excursion} favMutation={favMutation} compact />
        </div>
      </div>

      <div className="container-site pb-10 lg:pb-10">
        <Link to="/search" className="text-brand-700 hover:underline">← Усі екскурсії</Link>
      </div>
    </>
  )
}
