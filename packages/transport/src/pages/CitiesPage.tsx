import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { transportApi } from '@gaido/api-client/api/transport'
import { pageTitle } from '@gaido/site-urls/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import { Seo } from '../lib/seo'
import { aggregateCitiesFromRides } from '../lib/transportDestinations'

export default function CitiesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cities-with-rides'],
    queryFn: () => transportApi.search({ limit: 100 }),
  })

  const cities = aggregateCitiesFromRides(data?.items ?? [])

  return (
    <>
      <Seo
        title={pageTitle('Напрямки')}
        description="Міста та міжнародні маршрути Vezu — рейси з і до популярних напрямків для українців."
        path="/cities"
      />
      <Breadcrumbs items={[{ label: 'Напрямки' }]} />
      <div className="container-site space-y-6 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="section-title">Напрямки</h1>
          <p className="text-muted">Міста, через які проходять опубліковані рейси. Оберіть місто, щоб побачити маршрути звідси та сюди.</p>
        </div>

        {isLoading ? (
          <p className="text-muted">Завантаження…</p>
        ) : isError ? (
          <p className="text-muted">Не вдалося завантажити напрямки.</p>
        ) : cities.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <Link
                key={city.id}
                to={`/cities/${city.slug}`}
                className="card flex items-center justify-between p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
              >
                <div>
                  <p className="font-medium text-ink">{city.name}</p>
                  {city.countryName && <p className="text-sm text-muted">{city.countryName}</p>}
                </div>
                <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs text-muted">{city.rideCount} рейсів</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted">Напрямків поки немає. Запустіть демо-дані: LOCAL_SEED=1 ./restart-local.sh</p>
        )}
      </div>
    </>
  )
}
