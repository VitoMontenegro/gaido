import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '../api/discover'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { useLocation } from '../contexts/LocationContext'
import LocationPicker from '../components/location/LocationPicker'
import { Seo } from '../lib/seo'
import { pageTitle } from '../lib/brand'

export default function JobsPage() {
  const loc = useLocation()

  const cityParams = useMemo(
    () => (loc.cityId ? { city_id: loc.cityId } : loc.regionId ? { region_id: loc.regionId } : {}),
    [loc.cityId, loc.regionId],
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['jobs', cityParams],
    queryFn: () => discoverApi.jobs(cityParams),
    enabled: loc.hasLocation,
  })

  const useFallback =
    loc.hasLocation && !isLoading && !isError && (data?.total ?? 0) === 0 && Boolean(loc.cityId || loc.regionId)

  const { data: allJobs, isLoading: allLoading } = useQuery({
    queryKey: ['jobs-all'],
    queryFn: () => discoverApi.jobs({}),
    enabled: !loc.hasLocation || useFallback,
  })

  const usingFallback = useFallback && (allJobs?.total ?? 0) > 0
  const items = loc.hasLocation
    ? usingFallback
      ? (allJobs?.items ?? [])
      : (data?.items ?? [])
    : (allJobs?.items ?? [])
  const totalCount = loc.hasLocation
    ? usingFallback
      ? (allJobs?.total ?? 0)
      : (data?.total ?? 0)
    : (allJobs?.total ?? 0)
  const loading = loc.hasLocation ? isLoading || (useFallback && allLoading) : allLoading
  const placeLabel = loc.cityName ? `у ${loc.cityName}` : 'поруч із вами'

  return (
    <>
      <Seo title={pageTitle('Робота')} path="/jobs" />
      <div className="container-site space-y-6 py-8">
        <header className="space-y-4">
          <h1 className="section-title">💼 Робота</h1>
          <p className="text-muted">
            {loc.hasLocation
              ? `Вакансії ${placeLabel}${totalCount > 0 ? ` · ${totalCount}` : ''}`
              : 'Оберіть місто або перегляньте всі вакансії'}
          </p>

          {usingFallback && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              У {loc.cityName ?? 'вашому місті'} вакансій поки немає. Показуємо всі доступні — оберіть інше
              місто (наприклад, Berlin або Warszawa).
            </div>
          )}

          <div className="card p-4">
            <p className="mb-3 font-medium">📍 {loc.hasLocation ? `Місто: ${loc.cityName}` : 'Де ви шукаєте роботу?'}</p>
            <LocationPicker />
          </div>
        </header>

        {isError && <ApiErrorBanner error={error} hint="Не вдалося завантажити вакансії" />}

        {loading && <p className="text-muted">Завантаження…</p>}

        {!loading && items.length === 0 && (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-muted">
            Вакансій поки немає. Спробуйте інше місто — демо-дані є в Berlin, Warszawa, Prague, Krakow, Vienna.
          </p>
        )}

        <div className="grid gap-4">
          {items.map((j) => (
            <article key={j.id} className="card p-5">
              <h2 className="font-medium text-ink">{j.title}</h2>
              {j.company && <p className="text-sm text-muted">{j.company}</p>}
              <p className="mt-2 line-clamp-3 text-sm text-muted">{j.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                {j.employment_type && <span>{j.employment_type}</span>}
                {j.schedule_text && <span>· {j.schedule_text}</span>}
                {j.salary_text && <span>· {j.salary_text}</span>}
              </div>
              {(j.contact_text || j.contact_url) && (
                <p className="mt-2 text-sm">
                  {j.contact_url ? (
                    <a href={j.contact_url} className="link-accent" target="_blank" rel="noreferrer">
                      Зв&apos;язатися
                    </a>
                  ) : (
                    j.contact_text
                  )}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
