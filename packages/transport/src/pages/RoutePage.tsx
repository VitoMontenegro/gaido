import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { transportApi } from '@gaido/api-client/api/transport'
import Breadcrumbs from '../components/Breadcrumbs'
import RideCard from '../components/RideCard'
import { Seo } from '../lib/seo'
import { POPULAR_ROUTES } from '../lib/popularRoutes'
import { seoRouteDescription, seoRouteTitle } from '../lib/seoTemplates'

export default function RoutePage() {
  const { fromSlug = '', toSlug = '' } = useParams()

  const { data: fromCity, isLoading: fromLoading } = useQuery({
    queryKey: ['city', fromSlug],
    queryFn: () => catalogApi.city(fromSlug),
    enabled: Boolean(fromSlug),
  })
  const { data: toCity, isLoading: toLoading } = useQuery({
    queryKey: ['city', toSlug],
    queryFn: () => catalogApi.city(toSlug),
    enabled: Boolean(toSlug),
  })

  const { data: ridesData, isLoading: ridesLoading, isError } = useQuery({
    queryKey: ['route-rides', fromCity?.id, toCity?.id],
    queryFn: () =>
      transportApi.search({
        from_city_id: fromCity!.id,
        to_city_id: toCity!.id,
        limit: 50,
      }),
    enabled: Boolean(fromCity?.id && toCity?.id),
  })

  if (fromLoading || toLoading) {
    return <div className="container-site py-12 text-muted">Завантаження…</div>
  }
  if (!fromCity || !toCity) {
    return <div className="container-site py-12 text-muted">Маршрут не знайдено</div>
  }

  const label = `${fromCity.name} → ${toCity.name}`
  const items = ridesData?.items ?? []
  const related = POPULAR_ROUTES.filter(
    (r) => r.from === fromSlug || r.to === toSlug || r.from === toSlug || r.to === fromSlug,
  )

  return (
    <>
      <Seo
        title={seoRouteTitle(fromCity.name, toCity.name)}
        description={seoRouteDescription(fromCity.name, toCity.name, ridesData?.total)}
        path={`/routes/${fromSlug}/${toSlug}`}
      />
      <Breadcrumbs
        items={[
          { label: 'Напрямки', to: '/cities' },
          { label: fromCity.name, to: `/cities/${fromSlug}` },
          { label: label },
        ]}
      />
      <div className="container-site space-y-8 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="section-title">{label}</h1>
          <p className="text-muted">
            Регулярні маршрутки та попутки {fromCity.name} → {toCity.name}. Бронювання та контакти перевізників на Vezu.
          </p>
          <Link
            to={`/search?from_city_id=${fromCity.id}&to_city_id=${toCity.id}`}
            className="inline-flex text-sm font-medium text-teal hover:underline"
          >
            Розширений пошук з фільтрами →
          </Link>
        </div>

        {ridesLoading ? (
          <p className="text-muted">Завантаження…</p>
        ) : isError ? (
          <p className="text-muted">Не вдалося завантажити рейси.</p>
        ) : items.length ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Знайдено: {ridesData?.total ?? items.length}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-divider bg-sand-50 px-4 py-6 text-sm text-muted">
            Рейсів за маршрутом {label} поки немає. Спробуйте іншу дату в{' '}
            <Link to={`/search?from_city_id=${fromCity.id}&to_city_id=${toCity.id}`} className="text-teal hover:underline">
              пошуку
            </Link>.
          </div>
        )}

        {related.length > 1 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Інші напрямки</h2>
            <div className="flex flex-wrap gap-2">
              {related
                .filter((r) => !(r.from === fromSlug && r.to === toSlug))
                .map((route) => (
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
      </div>
    </>
  )
}
