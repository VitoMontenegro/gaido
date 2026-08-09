import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import CitiesMap from '../components/CitiesMap'
import MapDestinationsList from '../components/MapDestinationsList'
import ExcursionCard from '../components/ExcursionCard'
import { pageTitle } from '../lib/brand'

export default function CityPage() {
  const { slug = '' } = useParams()
  const { data: city } = useQuery({
    queryKey: ['city', slug],
    queryFn: () => catalogApi.city(slug),
  })
  const { data: guides } = useQuery({
    queryKey: ['guides', city?.id],
    queryFn: () => catalogApi.guides(city ? { city_id: String(city.id) } : undefined),
    enabled: !!city?.id,
  })
  const { data: excursions } = useQuery({
    queryKey: ['excursions', city?.id],
    queryFn: () => catalogApi.excursions(city ? { city_id: String(city.id) } : undefined),
    enabled: !!city?.id,
  })

  if (!city) return <div className="p-8">Завантаження...</div>

  const mapPoint = city.latitude && city.longitude
    ? [{ id: city.id, slug: city.slug, name: city.name, country_slug: city.country_slug ?? '', lat: city.latitude, lng: city.longitude }]
    : []

  return (
    <>
      <Helmet><title>{pageTitle(city.name)}</title></Helmet>
      <Breadcrumbs
        items={[
          { label: 'Карта', to: '/map' },
          { label: city.name },
        ]}
      />
      <div className="container-site py-8">
        <h1 className="font-display text-3xl font-bold">{city.name}</h1>

        {mapPoint.length > 0 && (
          <section className="mt-6">
            <CitiesMap points={mapPoint} />
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Гіди</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(guides?.items ?? []).map((g) => (
              <Link key={g.id} to={`/guide/${g.slug}`} className="card hover:shadow-md">{g.display_name}</Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Екскурсії</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(excursions?.items ?? []).map((e) => (
              <ExcursionCard key={e.id} e={e} />
            ))}
          </div>
        </section>
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
          <p className="mt-6 text-stone-500">Завантаження…</p>
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
