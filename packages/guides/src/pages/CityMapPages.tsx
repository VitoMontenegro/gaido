import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, placePagesApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import CitiesMap from '../components/CitiesMap'
import MapDestinationsList from '../components/MapDestinationsList'
import ExcursionCard from '../components/ExcursionCard'
import { PlaceBody, PlaceExcerpt } from '../components/PlacePageBlocks'
import SeoFaqSection from '../components/SeoFaqSection'
import { buildExcursionListingJsonLd, buildPlaceJsonLd } from '../lib/excursionListingSchema'
import { Seo } from '../lib/seo'
import {
  buildFaqPageJsonLd,
  cityExcursionFaq,
  defaultCityIntro,
  placeFaqOrDefault,
  placeSeoDescription,
  placeSeoTitle,
  seoCityExcursionsDescription,
  seoCityExcursionsHeading,
  seoCityExcursionsTitle,
  SEO_MAP_DESCRIPTION,
  SEO_MAP_HEADING,
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
  const { data: placePage } = useQuery({
    queryKey: ['place-page', 'city', slug],
    queryFn: () => placePagesApi.public('city', slug),
    enabled: !!slug,
    retry: false,
  })

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const countryName = (countries?.items ?? []).find((c) => c.slug === city?.country_slug)?.name

  const guideItems = guides?.items ?? []
  const excursionItems = excursions?.items ?? []
  const faqItems = placeFaqOrDefault(
    placePage?.faq,
    city && !excursionsLoading && excursionItems.length > 0 ? cityExcursionFaq(city.name, countryName) : [],
  )
  const seoDescription = city
    ? placeSeoDescription(placePage?.seo_description, seoCityExcursionsDescription(city.name, countryName))
    : undefined
  const excerptFallback = city && !guidesLoading && !excursionsLoading && (guideItems.length > 0 || excursionItems.length > 0)
    ? defaultCityIntro(city.name, countryName)
    : ''

  const jsonLd = useMemo(() => {
    if (!city) return []
    const schemas = buildExcursionListingJsonLd(excursionItems, {
      name: seoCityExcursionsHeading(city.name),
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
        title={city ? placeSeoTitle(placePage?.seo_title, seoCityExcursionsTitle(city.name)) : pageTitle('Місто')}
        description={seoDescription}
        path={city ? `/city/${slug}` : undefined}
        image={placePage?.seo_image_url || undefined}
        jsonLd={jsonLd.length > 0 ? jsonLd : undefined}
      />
      {city ? (
        <Breadcrumbs items={breadcrumbItems} currentPath={`/city/${slug}`} />
      ) : (
        <BreadcrumbSkeleton />
      )}
      <div className="container-site py-8">
        {city ? (
          <h1 className="font-display text-3xl font-bold">{seoCityExcursionsHeading(city.name)}</h1>
        ) : cityLoading ? (
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-sand-100" aria-label="Завантаження" />
        ) : (
          <p className="text-muted">Місто не знайдено.</p>
        )}

        {city && (
          <>
            <PlaceExcerpt value={placePage?.excerpt} fallback={excerptFallback} />

            <section className="mt-8 min-h-[120px]">
              <h2 className="mb-4 text-xl font-semibold">Україномовні гіди</h2>
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

            <PlaceBody html={placePage?.intro_html} />
            {faqItems.length > 0 && <SeoFaqSection items={faqItems} />}
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
      <Seo title={pageTitle(SEO_MAP_HEADING)} description={SEO_MAP_DESCRIPTION} path="/map" />
      <Breadcrumbs items={[{ label: 'Карта' }]} currentPath="/map" />
      <div className="container-site py-5 sm:py-8">
        <h1 className="font-display text-xl font-bold leading-tight break-normal sm:text-3xl">{SEO_MAP_HEADING}</h1>
        <p className="mt-1.5 text-sm text-stone-600 sm:mt-2 sm:text-base">{SEO_MAP_DESCRIPTION}</p>

        {isLoading ? (
          <div className="mt-6 min-h-80 animate-pulse rounded-2xl bg-sand-100 sm:min-h-130" aria-label="Завантаження карти" />
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
