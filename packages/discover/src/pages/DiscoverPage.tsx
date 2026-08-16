import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { discoverApi } from '@gaido/api-client/api/discover'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { locationQueryParams, useLocation } from '../contexts/LocationContext'
import DiscoverMap from '../components/discover/DiscoverMap'
import DiscoverOfferingsList from '../components/discover/DiscoverOfferingsList'
import LocationPicker from '../components/location/LocationPicker'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'
import { distanceKm } from '../lib/geo'
import type { DiscoverOffering } from '@gaido/api-client/api/types/discover'
import { FORMAT_LABELS } from '@gaido/api-client/api/types/discover'

const SECTION_LABELS: Record<string, string> = {
  transport: 'Транспорт та таксі',
  places: 'Українські місця',
  help: 'Допомога українцям',
}

function countByCategory(items: DiscoverOffering[]) {
  const map = new Map<string, { name: string; count: number }>()
  for (const item of items) {
    const prev = map.get(item.category_slug)
    map.set(item.category_slug, {
      name: item.category_name,
      count: (prev?.count ?? 0) + 1,
    })
  }
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count)
}

export default function DiscoverPage() {
  const loc = useLocation()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'map' | 'list'>('map')

  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const format = params.get('format') ?? ''
  const section = params.get('section') ?? ''
  const sort = params.get('sort') ?? ''
  const canSearch = loc.hasLocation || Boolean(section)
  const sectionLabel = SECTION_LABELS[section]

  const baseParams = useMemo(
    () => ({
      ...locationQueryParams(loc),
      q: q || undefined,
      category: category || undefined,
      format: format || undefined,
      section: section || undefined,
      sort: sort || undefined,
      verified: params.get('verified') === '1' ? '1' : undefined,
      availability: params.get('availability') === '1' ? '1' : undefined,
    }),
    [loc, q, category, format, section, sort, params],
  )

  const sectionFallbackParams = useMemo(
    () => ({
      radius_km: loc.radiusKm,
      q: q || undefined,
      category: category || undefined,
      format: format || undefined,
      section: section || undefined,
      sort: sort || undefined,
      verified: params.get('verified') === '1' ? '1' : undefined,
      availability: params.get('availability') === '1' ? '1' : undefined,
    }),
    [loc.radiusKm, q, category, format, section, sort, params],
  )

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => discoverApi.categories(),
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['discover', baseParams],
    queryFn: () => discoverApi.discover(baseParams),
    enabled: canSearch,
  })

  const { data: mapData, isError: mapError, error: mapErr } = useQuery({
    queryKey: ['discover-map', baseParams],
    queryFn: () => discoverApi.mapPoints(baseParams),
    enabled: canSearch,
  })

  const useSectionFallback =
    Boolean(section) && loc.hasLocation && !isLoading && !isError && (data?.total ?? 0) === 0

  const { data: fallbackData } = useQuery({
    queryKey: ['discover-section-fallback', sectionFallbackParams],
    queryFn: () => discoverApi.discover(sectionFallbackParams),
    enabled: useSectionFallback,
  })

  const { data: fallbackMapData } = useQuery({
    queryKey: ['discover-map-section-fallback', sectionFallbackParams],
    queryFn: () => discoverApi.mapPoints(sectionFallbackParams),
    enabled: useSectionFallback,
  })

  const placeLabel = loc.cityName ? `${loc.cityName} та поруч` : 'поруч із вами'
  const usingFallback = useSectionFallback && (fallbackData?.items.length ?? 0) > 0
  const items = usingFallback ? (fallbackData?.items ?? []) : (data?.items ?? [])
  const mapPoints = usingFallback ? (fallbackMapData?.items ?? []) : (mapData?.items ?? [])
  const totalCount = usingFallback ? (fallbackData?.total ?? 0) : (data?.total ?? 0)

  const anchor = loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null

  const localMapPoints = useMemo(() => {
    if (!anchor) return mapPoints
    return mapPoints.filter((p) => distanceKm(p, anchor) <= loc.radiusKm + 2)
  }, [mapPoints, anchor, loc.radiusKm])

  const providerSlugByOfferingId = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of items) {
      map.set(item.id, item.provider.website_slug)
    }
    return map
  }, [items])

  const mapPointsForView = useMemo(
    () =>
      localMapPoints.map((p) => ({
        ...p,
        provider_slug: p.provider_slug || providerSlugByOfferingId.get(p.offering_id) || '',
      })),
    [localMapPoints, providerSlugByOfferingId],
  )

  const stats = useMemo(() => {
    const online = items.filter((i) => i.formats.includes('online')).length
    const inCity = loc.cityName ? items.filter((i) => i.city_name === loc.cityName).length : 0
    const inRadius = anchor
      ? items.filter((i) => i.distance_km != null && i.distance_km <= loc.radiusKm).length
      : 0
    const remoteOnMap = mapPoints.length - localMapPoints.length
    return { online, inCity, inRadius, remoteOnMap, categories: countByCategory(items) }
  }, [items, loc.cityName, loc.radiusKm, anchor, mapPoints.length, localMapPoints.length])

  return (
    <>
      <Seo title={pageTitle(`Послуги ${placeLabel}`)} path="/discover" />
      <div className="container-site space-y-6 py-8">
        <header className="space-y-4">
          <h1 className="section-title">
            {sectionLabel ?? `Українці в ${placeLabel}`}
          </h1>
          {sectionLabel && !loc.hasLocation && (
            <p className="text-muted">Оберіть місто, щоб побачити пропозиції поруч із вами</p>
          )}
          {usingFallback && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              У {loc.cityName ?? 'вашому місті'} пропозицій у цьому розділі немає. Показуємо всі доступні
              обʼявлення — оберіть інше місто (наприклад, Berlin) для пошуку поруч.
            </div>
          )}
          <LocationPicker />
        </header>

        {canSearch && (
          <>
            {(isError || mapError) && (
              <ApiErrorBanner error={error ?? mapErr} hint="Не вдалося завантажити пропозиції" />
            )}

            {!isLoading && totalCount > 0 && (
              <div className="discover-stats-card space-y-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {loc.cityName && (
                    <span className="font-medium text-ink">
                      📍 {loc.cityName}
                      {loc.hasLocation ? ` · ${loc.radiusKm} км` : ''}
                    </span>
                  )}
                  <span className="text-ink">
                    <strong>{totalCount}</strong> пропозицій
                  </span>
                  {loc.cityName && stats.inCity > 0 && (
                    <span className="text-muted">
                      · <strong>{stats.inCity}</strong> у {loc.cityName}
                    </span>
                  )}
                  {stats.inRadius > 0 && loc.hasLocation && (
                    <span className="text-muted">
                      · <strong>{stats.inRadius}</strong> у радіусі
                    </span>
                  )}
                  <span className="text-muted">
                    · <strong>{localMapPoints.length}</strong> на карті
                  </span>
                  {stats.online > 0 && (
                    <span className="text-muted">
                      · <strong>{stats.online}</strong> онлайн
                    </span>
                  )}
                </div>
                {stats.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {stats.categories.map(([slug, { name, count }]) => (
                      <Link
                        key={slug}
                        to={{ search: (() => {
                          const next = new URLSearchParams(params)
                          next.set('category', slug)
                          return next.toString()
                        })() }}
                        className="rounded-full bg-sand-100 px-3 py-1 text-xs text-ink transition hover:bg-sand-200 hover:text-brand-700"
                      >
                        {name} · {count}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="discover-stats-card space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="input flex-1"
                placeholder="🔎 Що ви шукаєте?"
                defaultValue={q}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value
                    setParams((p) => {
                      if (v) p.set('q', v)
                      else p.delete('q')
                      return p
                    })
                  }
                }}
              />
              <div className="flex gap-2">
                {(['map', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`rounded-xl px-3 py-2 text-sm ${view === v ? 'bg-ink text-white' : 'bg-sand-100'}`}
                    onClick={() => setView(v)}
                  >
                    {v === 'map' ? '🗺 Карта' : '📋 Список'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="input w-auto"
                value={category}
                onChange={(e) =>
                  setParams((p) => {
                    if (e.target.value) p.set('category', e.target.value)
                    else p.delete('category')
                    return p
                  })
                }
              >
                <option value="">Усі категорії</option>
                {(categories?.items ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <select
                className="input w-auto"
                value={format}
                onChange={(e) =>
                  setParams((p) => {
                    if (e.target.value) p.set('format', e.target.value)
                    else p.delete('format')
                    return p
                  })
                }
              >
                <option value="">Формат</option>
                {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm ${sort === 'nearest' ? 'bg-ink text-white' : 'bg-sand-100'}`}
                onClick={() =>
                  setParams((p) => {
                    if (sort === 'nearest') p.delete('sort')
                    else p.set('sort', 'nearest')
                    return p
                  })
                }
              >
                Найближчі
              </button>
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm ${params.get('verified') === '1' ? 'bg-ink text-white' : 'bg-sand-100'}`}
                onClick={() =>
                  setParams((p) => {
                    if (p.get('verified') === '1') p.delete('verified')
                    else p.set('verified', '1')
                    return p
                  })
                }
              >
                ✓ Перевірені
              </button>
            </div>
            </div>

            {isLoading && <p className="text-muted">Завантаження…</p>}

            <div className="grid gap-6">
              {view === 'map' && (
                <div className="space-y-4">
                  {localMapPoints.length === 0 && totalCount > 0 && (
                    <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                      У {loc.cityName ?? 'обраному місті'} немає адрес на карті — перегляньте список нижче
                      {stats.online > 0 ? ` (${stats.online} онлайн)` : ''}.
                    </p>
                  )}
                  {stats.remoteOnMap > 0 && localMapPoints.length > 0 && (
                    <p className="text-sm text-muted">
                      На карті лише {localMapPoints.length} адрес у радіусі {loc.radiusKm} км
                      {stats.remoteOnMap > 0 ? ` (+${stats.remoteOnMap} за межами)` : ''}.
                    </p>
                  )}
                  <DiscoverMap points={mapPointsForView} center={anchor} />
                  {items.length > 0 && (
                    <DiscoverOfferingsList
                      items={items}
                      compact
                      title={`Пропозиції поруч${loc.cityName ? ` · ${loc.cityName}` : ''}`}
                      emptyMessage="Пропозицій у цій зоні поки немає."
                    />
                  )}
                </div>
              )}
              {view === 'list' && (
                <DiscoverOfferingsList
                  items={items}
                  title={`Усі пропозиції${loc.cityName ? ` · ${loc.cityName}` : ''}`}
                  emptyMessage={
                    loc.hasLocation
                      ? 'Пропозицій у цій зоні поки немає. Спробуйте збільшити радіус або обрати інше місто.'
                      : 'Пропозицій у цьому розділі поки немає.'
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
