import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import CitiesMap from '../components/CitiesMap'
import MapDestinationsList from '../components/MapDestinationsList'
import ExcursionCard from '../components/ExcursionCard'
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

  const guideItems = guides?.items ?? []
  const excursionItems = excursions?.items ?? []

  return (
    <>
      <Helmet><title>{pageTitle(city?.name ?? 'Місто')}</title></Helmet>
      {city ? (
        <Breadcrumbs
          items={[
            { label: 'Карта', to: '/map' },
            { label: city.name },
          ]}
        />
      ) : (
        <BreadcrumbSkeleton />
      )}
      <div className="container-site py-8">
        {city ? (
          <h1 className="font-display text-3xl font-bold">{city.name}</h1>
        ) : cityLoading ? (
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-sand-100" aria-label="Завантаження" />
        ) : (
          <p className="text-muted">Місто не знайдено.</p>
        )}

        {city && (
          <>
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
      <Helmet><title>{pageTitle('Карта')}</title></Helmet>
      <Breadcrumbs items={[{ label: 'Карта' }]} />
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
