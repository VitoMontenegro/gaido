import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { carrierApi } from '@gaido/api-client/api/carrier'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { transportApi } from '@gaido/api-client/api/transport'
import Breadcrumbs from '../components/Breadcrumbs'
import CarrierCard, { CarrierCardGrid } from '../components/CarrierCard'
import RideCard from '../components/RideCard'
import { Seo } from '../lib/seo'
import { POPULAR_ROUTES } from '../lib/popularRoutes'
import { seoCityHubDescription, seoCityHubTitle } from '../lib/seoTemplates'
import { ridesArrivingTo, ridesDepartingFrom } from '../lib/transportDestinations'

export default function CityHubPage() {
  const { slug = '' } = useParams()

  const { data: city, isLoading: cityLoading, isError: cityError } = useQuery({
    queryKey: ['city', slug],
    queryFn: () => catalogApi.city(slug),
    enabled: Boolean(slug),
  })

  const { data: ridesData, isLoading: ridesLoading } = useQuery({
    queryKey: ['city-rides', slug],
    queryFn: () => transportApi.search({ limit: 100 }),
    enabled: Boolean(slug),
  })

  const { data: carriersData } = useQuery({
    queryKey: ['city-carriers', city?.id],
    queryFn: () => carrierApi.list({ base_city_id: city!.id, limit: 12 }),
    enabled: Boolean(city?.id),
  })

  const allRides = ridesData?.items ?? []
  const fromRides = city ? ridesDepartingFrom(allRides, city.id) : []
  const toRides = city ? ridesArrivingTo(allRides, city.id) : []
  const relatedRoutes = POPULAR_ROUTES.filter((r) => r.from === slug || r.to === slug)

  if (cityLoading || ridesLoading) {
    return <div className="container-site py-12 text-muted">Завантаження…</div>
  }
  if (cityError || !city) {
    return <div className="container-site py-12 text-muted">Місто не знайдено</div>
  }

  const cityName = city.name
  const totalRides = fromRides.length + toRides.length

  return (
    <>
      <Seo
        title={seoCityHubTitle(cityName)}
        description={seoCityHubDescription(cityName, totalRides)}
        path={`/cities/${slug}`}
      />
      <Breadcrumbs items={[{ label: 'Напрямки', to: '/cities' }, { label: cityName }]} />
      <div className="container-site space-y-10 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="section-title">Рейси: {cityName}</h1>
          <p className="text-muted">
            Маршрутки та попутки з цього міста та до нього.
          </p>
        </div>

        {relatedRoutes.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Популярні маршрути</h2>
            <div className="flex flex-wrap gap-2">
              {relatedRoutes.map((route) => (
                <Link
                  key={route.label}
                  to={`/routes/${route.from}/${route.to}`}
                  className="rounded-full border border-divider bg-surface px-4 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {route.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {fromRides.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Рейси з {cityName}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {fromRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          </section>
        )}

        {toRides.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Рейси до {cityName}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {toRides.map((ride) => (
                <RideCard key={`to-${ride.id}`} ride={ride} />
              ))}
            </div>
          </section>
        )}

        {(carriersData?.items ?? []).length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Перевізники в {cityName}</h2>
            <CarrierCardGrid>
              {(carriersData?.items ?? []).map((c) => (
                <CarrierCard key={c.provider_id} carrier={c} compact />
              ))}
            </CarrierCardGrid>
          </section>
        )}

        {fromRides.length === 0 && toRides.length === 0 && (
          <p className="text-muted">
            Рейсів через {cityName} поки немає. Спробуйте інше місто або{' '}
            <Link to="/search" className="text-teal hover:underline">пошук</Link>.
          </p>
        )}
      </div>
    </>
  )
}
