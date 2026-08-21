import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@gaido/api-client/api/client'
import type { ExcursionItem } from '../components/excursionUi'
import {
  excursionPriceCaption,
  formatPrice,
} from '../components/excursionUi'
import BookingTermsSection from '../components/BookingTermsSection'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCover from '../components/ExcursionCover'
import ExcursionComfortBlock from '../components/ExcursionComfortBlock'
import ExcursionHeroGallery from '../components/ExcursionHeroGallery'
import ExcursionDetailsGrid from '../components/ExcursionDetailsGrid'
import {
  ExcursionAvailabilityButton,
  ExcursionAvailabilityDialog,
} from '../components/ExcursionAvailabilityButton'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import ExcursionPhotoLocations from '../components/ExcursionPhotoLocations'
import ExcursionReadMore from '../components/ExcursionReadMore'
import ExcursionRouteSection from '../components/ExcursionRouteSection'
import ExcursionVideoBlock from '../components/ExcursionVideoBlock'
import ExcursionOrganizerSection from '../components/ExcursionOrganizerSection'
import GuideContactPills, { guideContactLinks } from '../components/GuideContactPills'
import ReviewsSection from '../components/reviews/ReviewsSection'
import StarRating from '../components/reviews/StarRating'
import { trackRecentView, removeRecentView } from '../hooks/useRecentViews'
import { useHasRole, useMe } from '@gaido/api-client/hooks/useAuth'
import { getApiErrorCode } from '@gaido/api-client/api/http'
import CatalogNotFound from '../components/CatalogNotFound'
import FavoriteButton from '../components/FavoriteButton'
import { resolveMapEmbed } from '../lib/mapEmbed'
import {
  hasStructuredContent,
  isValidMediaRef,
  normalizeStructuredContent,
} from '../lib/excursionStructuredContent'
import { buildExcursionEventJsonLd } from '../lib/excursionEventSchema'
import { seoExcursionTitle } from '../lib/seoTemplates'
import { Seo } from '../lib/seo'
import type { Contacts } from '@gaido/api-client/api/types/catalog'
import { sanitizeHtml } from '../lib/html'

function ExcursionBookingPanel({
  excursion,
  compact = false,
  contacts,
}: {
  excursion: ExcursionItem
  compact?: boolean
  contacts?: Contacts
}) {
  const links = contacts ? guideContactLinks(contacts) : []

  const contactBlock =
    links.length > 0 ? (
      <GuideContactPills links={links} className={compact ? 'mt-2' : undefined} />
    ) : contacts?.visible === false ? (
      <p className="text-sm text-stone-600">Контакти доступні після активації розміщення гіда.</p>
    ) : excursion.guide_slug ? (
      <Link to={`/guide/${excursion.guide_slug}`} className="text-sm font-medium text-teal hover:underline">
        Профіль гіда →
      </Link>
    ) : null

  const responseHours = contacts?.response_hours ? (
    <p className={`text-stone-600 ${compact ? 'mt-1 text-xs' : 'text-sm'}`}>{contacts.response_hours}</p>
  ) : null

  const favButton = (
    <FavoriteButton
      targetType="EXCURSION"
      targetId={excursion.id}
      variant={compact ? 'compact' : 'button'}
    />
  )

  if (compact) {
    return (
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold leading-tight text-teal">
              {formatPrice(excursion.price_from, excursion.currency)}
            </p>
            <p className="excursion-parus-muted truncate text-xs">{excursionPriceCaption(excursion.type)}</p>
          </div>
          {favButton}
        </div>
        {contactBlock}
        {responseHours}
      </div>
    )
  }

  return (
    <>
      <div>
        <p className="font-display text-3xl font-bold text-teal">
          {formatPrice(excursion.price_from, excursion.currency)}
        </p>
        <p className="excursion-parus-muted">{excursionPriceCaption(excursion.type)}</p>
      </div>
      <div className="space-y-4">
        {contactBlock}
        {responseHours}
        {favButton}
        <div className="border-t border-stone-100 pt-3 excursion-parus-text">
          <p className="font-medium text-stone-800">Як це працює</p>
          <p className="mt-1">Звʼяжіться з гідом напряму — бронювання та оплата поза платформою.</p>
        </div>
      </div>
    </>
  )
}

export default function ExcursionPage() {
  const { slug = '' } = useParams()
  const { data: me } = useMe()
  const isGuideRole = useHasRole('ROLE_GUIDE')
  const [availabilityOpen, setAvailabilityOpen] = useState(false)

  const { data: excursion, isLoading, isError, error } = useQuery({
    queryKey: ['excursion', slug],
    queryFn: () => api<ExcursionItem>(`/api/v1/excursions/${slug}`),
    retry: (_, err) => getApiErrorCode(err) !== 'NOT_FOUND',
  })
  const { data: myGuide } = useQuery({
    queryKey: ['my-guide-profile'],
    queryFn: () => api<{ id: number }>('/api/v1/account/guide/profile'),
    enabled: isGuideRole,
  })

  const { data: datesData } = useQuery({
    queryKey: ['excursion-dates-public', slug, 'schema'],
    queryFn: () =>
      api<{ items: { starts_at: string; ends_at: string }[] }>(
        `/api/v1/excursions/${slug}/dates?months=6`,
      ),
    enabled: !!slug && !!excursion && excursion.status === 'PUBLISHED',
  })

  useEffect(() => {
    if (!excursion || excursion.status !== 'PUBLISHED') return
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

  useEffect(() => {
    if (isError && getApiErrorCode(error) === 'NOT_FOUND' && slug) {
      removeRecentView('excursion', slug)
    }
  }, [isError, error, slug])

  if (isLoading) return <div className="container-site p-8 text-muted">Завантаження…</div>
  if (isError || !excursion) return <CatalogNotFound kind="excursion" />

  const structured = normalizeStructuredContent(excursion.structured_content)
  const gallery = structured.gallery.filter(isValidMediaRef)
  const useParusLayout = hasStructuredContent(structured, excursion.cover_image_url)
  const duration = excursion.duration_minutes ?? 180
  const transport = excursion.transport_mode ?? 'WALKING'
  const language = excursion.language ?? 'uk'
  const ratingAvg = excursion.rating_avg ?? 0
  const ratingCount = excursion.rating_count ?? 0
  const isUnpublished = excursion.status !== 'PUBLISHED'
  const isGuideOwner = !!myGuide && myGuide.id === excursion.guide_id
  const body = excursion.body_html?.trim() || (excursion.description ? `<p>${excursion.description}</p>` : '')
  const mapUrl = resolveMapEmbed(excursion.map_embed_url)
  const hasBooking =
    (excursion.included_items?.length ?? 0) > 0 ||
    (excursion.excluded_items?.length ?? 0) > 0 ||
    !!excursion.organizational_details?.trim() ||
    !!excursion.meeting_point?.trim()

  const upcomingDates = datesData?.items ?? []
  const eventJsonLd = isUnpublished
    ? []
    : upcomingDates.length > 0
      ? upcomingDates
          .slice(0, 10)
          .map((d) =>
            buildExcursionEventJsonLd(excursion, { startsAt: d.starts_at, endsAt: d.ends_at }),
          )
          .filter((item): item is Record<string, unknown> => item !== null)
      : ([buildExcursionEventJsonLd(excursion)].filter(Boolean) as Record<string, unknown>[])

  const breadcrumbItems = [
    { label: 'Екскурсії', to: '/search' },
    ...(excursion.country_name && excursion.country_slug
      ? [{ label: excursion.country_name, to: `/countries/${excursion.country_slug}` }]
      : []),
    ...(excursion.city_name
      ? [{
          label: excursion.city_name,
          ...(excursion.city_slug ? { to: `/city/${excursion.city_slug}` } : {}),
        }]
      : []),
    { label: excursion.title },
  ]

  return (
    <div className="excursion-parus pb-28 lg:pb-10">
      <Seo
        title={seoExcursionTitle(excursion.title, excursion.city_name, excursion.price_from, excursion.currency)}
        description={excursion.description ?? ''}
        path={`/excursion/${excursion.slug}`}
        image={excursion.cover_image_url}
        noIndex={isUnpublished}
        jsonLd={eventJsonLd.length > 0 ? eventJsonLd : undefined}
      />

      <Breadcrumbs items={breadcrumbItems} currentPath={`/excursion/${excursion.slug}`} />

      {isUnpublished && (
        <div className="container-site pt-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Попередній перегляд — сторінка не в каталозі</p>
            <p className="mt-1">
              Статус: {excursion.status === 'DRAFT' ? 'чернетка' : excursion.status === 'PENDING_MODERATION' ? 'на модерації' : 'не опубліковано'}.
              {' '}Бачать лише ви як автор.
            </p>
            {isGuideOwner && (
              <Link to={`/account/guide/excursions/${excursion.id}/edit`} className="mt-2 inline-block font-medium text-teal hover:underline">
                Повернутися до редагування →
              </Link>
            )}
          </div>
        </div>
      )}

      <header className="container-site pt-8">
        <h1 className="font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">
          {excursion.title}
        </h1>
        {excursion.city_name && (
          <p className="mt-2 excursion-parus-text text-stone-600">{excursion.city_name}</p>
        )}
      </header>

      <div className="container-site grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {ratingCount > 0 && (
            <Link to="#reviews" className="excursion-parus-link inline-flex items-center gap-2">
              <StarRating value={ratingAvg} size="md" />
              <span>{ratingAvg.toFixed(1)} · {ratingCount} відгуків</span>
            </Link>
          )}

          {useParusLayout && gallery.length > 0 ? (
              <ExcursionHeroGallery
                  images={gallery}
                  mobileCover={structured.gallery_mobile_cover}
                  title={excursion.title}
              />
          ) : (
              <ExcursionCover
                  cover={excursion.cover_image_url}
                  title={excursion.title}
                  className={
                    excursion.cover_image_url?.trim()
                        ? 'aspect-video w-full max-h-105'
                        : 'aspect-21/9 w-full max-h-55 border-b border-divider'
                  }
              />
          )}

          <div className="rounded-3xl bg-white p-4 shadow-lg sm:p-6">
            <ExcursionDetailsGrid
              type={excursion.type}
              maxGuests={excursion.max_guests}
              durationMinutes={duration}
              transportMode={transport}
              language={language}
              childrenAllowed={excursion.children_allowed}
              onOpenAvailability={() => setAvailabilityOpen(true)}
            />
          </div>

          {useParusLayout ? (
            <>
              <ExcursionRouteSection
                stops={structured.route_stops}
                disclaimer={structured.route_disclaimer}
              />
              <ExcursionReadMore teaser={excursion.description} bodyHtml={excursion.body_html} />
              <ExcursionPhotoLocations images={structured.photo_locations} />
              <ExcursionVideoBlock video={structured.video} />
              <ExcursionComfortBlock items={structured.comfort_items} />
            </>
          ) : (
            <div
              className="excursion-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) || '<p>Опис зʼявиться незабаром.</p>' }}
            />
          )}

          {mapUrl && (
            <section className="excursion-parus-section  p-4">
              <h2 className="excursion-parus-section__title">Маршрут на карті</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-sand-50 shadow-sm">
                <iframe
                  title="Маршрут екскурсії"
                  src={mapUrl}
                  className="aspect-video min-h-70 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>
          )}

            {hasBooking && (
                <BookingTermsSection
                    included={excursion.included_items}
                    excluded={excursion.excluded_items}
                    notesHtml={excursion.organizational_details}
                    meetingPoint={excursion.meeting_point}
                />
            )}


            {excursion.guide_slug && (
                <ExcursionOrganizerSection
                    guideName={excursion.guide_name}
                    guideSlug={excursion.guide_slug}
                    guideAvatarUrl={excursion.guide_avatar_url}
                    guideAbout={excursion.guide_about}
                    guideRatingAvg={excursion.guide_rating_avg}
                    guideRatingCount={excursion.guide_rating_count}
                    contacts={excursion.guide_contacts}
                />
            )}

          <ReviewsSection
            className="excursion-parus-section scroll-mt-28 shadow-lg p-4"
            excursionId={excursion.id}
            fixedExcursionId={excursion.id}
            showExcursion={false}
            canReply={(r) => !!me && (isGuideOwner || me.id === r.author_id)}
            canDispute={() => isGuideOwner}
            invalidateKeys={[
              ['reviews', 'excursion', excursion.id],
              ['excursion', slug],
            ]}
          />
        </div>

        <aside className="hidden h-fit lg:block lg:sticky lg:top-26.25">
          <div className="space-y-4">
            <div className="card space-y-4 border-brand-200 shadow-lg">
              <ExcursionBookingPanel
                excursion={excursion}
                contacts={excursion.guide_contacts}
              />
              <ExcursionAvailabilityButton onClick={() => setAvailabilityOpen(true)} />
            </div>
          </div>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-page/95 px-5 py-3 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-365 items-center gap-3">
          <ExcursionBookingPanel
            excursion={excursion}
            contacts={excursion.guide_contacts}
            compact
          />
          <button
            type="button"
            className="btn-secondary shrink-0 px-3 py-2.5"
            aria-label="Доступні дати"
            onClick={() => setAvailabilityOpen(true)}
          >
            <CalendarDaysIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="container-site pb-10">
        <Link to="/search" className="text-brand-700 hover:underline">← Усі екскурсії</Link>
      </div>

      <ExcursionAvailabilityDialog
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        slug={excursion.slug}
        excursionType={excursion.type}
      />
    </div>
  )
}
