import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import CitiesMap from '../components/CitiesMap'
import MapDestinationsList from '../components/MapDestinationsList'
import ExcursionCard from '../components/ExcursionCard'
import SeoFaqSection from '../components/SeoFaqSection'
import { buildExcursionListingJsonLd, buildPlaceJsonLd } from '../lib/excursionListingSchema'
import { Seo } from '../lib/seo'
import {
  buildFaqPageJsonLd,
  cityExcursionFaq,
  seoCityExcursionsDescription,
  seoCityExcursionsTitle,
} from '../lib/seoTemplates'
import { pageTitle } from '@gaido/site-urls/brand'

function BreadcrumbSkeleton() {
  return (
    <div className="border-b border-divider bg-page">
      <div className="container-site py-4">
        <div className="h-5 w-48 max-w-full animate-pulse rounded bg-sand-100" aria-hidden />
      </div>
    </div>
  )
}

function GuideGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card h-[72px] animate-pulse bg-sand-100" aria-hidden />
      ))}
    </div>
  )
}

function ExcursionGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-surface" aria-hidden>
          <div className="aspect-[16/10] animate-pulse bg-sand-100" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-sand-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-sand-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CityPage() {
  const { slug = '' } = useParams()
  const { data: city, isLoading: cityLoading, isError: cityError } = useQuery({
    queryKey: ['city', slug],
    queryFn: () => catalogApi.city(slug),
  })
  const { data: guides, isLoading: guidesLoading } = useQuery({
    queryKey: ['guides', city?.id],
    queryFn: () => catalogApi.guides(city ? { city_id: String(city.id) } : undefined),
    enabled: !!city?.id,
  })
  const { data: excursions, isLoading: excursionsLoading } = useQuery({
    queryKey: ['excursions', city?.id],
    queryFn: () => catalogApi.excursions(city ? { city_id: String(city.id) } : undefined),
    enabled: !!city?.id,
  })

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const countryName = (countries?.items ?? []).find((c) => c.slug === city?.country_slug)?.name

  const guideItems = guides?.items ?? []
  const excursionItems = excursions?.items ?? []
  const faqItems = city ? cityExcursionFaq(city.name, countryName) : []
  const seoDescription = city ? seoCityExcursionsDescription(city.name, countryName) : undefined

  const jsonLd = useMemo(() => {
    if (!city) return []
    const schemas = buildExcursionListingJsonLd(excursionItems, {
      name: seoCityExcursionsTitle(city.name),
      description: seoDescription ?? '',
    })
    schemas.push(buildPlaceJsonLd({
      name: city.name,
      path: `/city/${slug}`,
      countryName,
    }))
    if (faqItems.length > 0) schemas.push(buildFaqPageJsonLd(faqItems))
    return schemas
  }, [city, excursionItems, slug, countryName, seoDescription, faqItems])

  const breadcrumbItems = city
    ? [
        ...(countryName && city.country_slug
          ? [{ label: countryName, to: `/countries/${city.country_slug}` }]
          : [{ label: 'Карта', to: '/map' }]),
        { label: city.name },
      ]
    : []

  return (
    <>
      <Seo
        title={city ? seoCityExcursionsTitle(city.name) : pageTitle('Місто')}
        description={seoDescription}
        path={city ? `/city/${slug}` : undefined}
        jsonLd={jsonLd.length > 0 ? jsonLd : undefined}
      />
      {city ? (
        <Breadcrumbs items={breadcrumbItems} currentPath={`/city/${slug}`} />
      ) : (
        <BreadcrumbSkeleton />
      )}
      <div className="container-site py-8">
        {city ? (
          <h1 className="font-display text-3xl font-bold">Екскурсії в {city.name}</h1>
        ) : cityLoading ? (
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-sand-100" aria-label="Завантаження" />
        ) : (
          <p className="text-muted">Місто не знайдено.</p>
        )}

        {city && (
          <>
            {excursionItems.length > 0 && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted md:text-base">
                Авторські тури в {city.name}{countryName ? `, ${countryName}` : ''} від місцевих гідів.
                Оберіть маршрут, перегляньте ціни та напишіть гіду для підтвердження дати.
              </p>
            )}

            <section className="mt-8 min-h-[120px]">
              <h2 className="mb-4 text-xl font-semibold">Гіди</h2>
              {guidesLoading ? (
                <GuideGridSkeleton />
              ) : guideItems.length === 0 ? (
                <p className="text-sm text-muted">Поки немає гідів у цьому місті.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {guideItems.map((g) => (
                    <Link key={g.id} to={`/guide/${g.slug}`} className="card hover:shadow-md">{g.display_name}</Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-10 min-h-[280px]">
              <h2 className="mb-4 text-xl font-semibold">Екскурсії</h2>
              {excursionsLoading ? (
                <ExcursionGridSkeleton />
              ) : excursionItems.length === 0 ? (
                <p className="text-sm text-muted">Поки немає екскурсій у цьому місті.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {excursionItems.map((e) => (
                    <ExcursionCard key={e.id} e={e} />
                  ))}
                </div>
              )}
            </section>

            {excursionItems.length > 0 && <SeoFaqSection items={faqItems} />}
          </>
        )}

        {!cityLoading && cityError && (
          <p className="mt-4 text-sm text-red-700">Не вдалося завантажити місто. Спробуйте оновити сторінку.</p>
        )}
      </div>
    </>
  )
}

export function MapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['map-points'],
    queryFn: () => catalogApi.mapPoints(),
  })

  const points = data?.items ?? []

  return (
    <>
      <Seo title={pageTitle('Карта')} description="Міста з опублікованими екскурсіями" path="/map" />
      <Breadcrumbs items={[{ label: 'Карта' }]} currentPath="/map" />
      <div className="container-site py-8">
        <h1 className="font-display text-3xl font-bold">Карта напрямків</h1>
        <p className="mt-2 text-stone-600">Міста з опублікованими екскурсіями — оберіть на карті або в списку</p>

        {isLoading ? (
          <div className="mt-6 min-h-[420px] animate-pulse rounded-2xl bg-sand-100" aria-label="Завантаження карти" />
        ) : points.length === 0 ? (
          <p className="mt-6 text-stone-500">Поки немає опублікованих екскурсій на карті.</p>
        ) : (
          <>
            <div className="mt-6">
              <CitiesMap points={points} />
            </div>
            <MapDestinationsList points={points} />
          </>
        )}
      </div>
    </>
  )
}
