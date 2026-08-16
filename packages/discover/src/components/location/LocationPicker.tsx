import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import type { Country } from '@gaido/api-client/api/types/catalog'
import { discoverApi } from '@gaido/api-client/api/discover'
import { RADIUS_OPTIONS } from '@gaido/api-client/api/types/discover'
import { useLocation } from '../../contexts/LocationContext'

const POPULAR_COUNTRY_SLUGS = [
  'de',
  'pl',
  'czechia',
  'ua',
  'at',
  'lt',
  'lv',
  'ee',
  'hu',
  'ro',
] as const

const POPULAR_LABELS: Record<string, string> = {
  de: '🇩🇪 Німеччина',
  pl: '🇵🇱 Польща',
  czechia: '🇨🇿 Чехія',
  ua: '🇺🇦 Україна',
  at: '🇦🇹 Австрія',
  lt: '🇱🇹 Литва',
  lv: '🇱🇻 Латвія',
  ee: '🇪🇪 Естонія',
  hu: '🇭🇺 Угорщина',
  ro: '🇷🇴 Румунія',
}

type Props = {
  onSelected?: () => void
  showRadius?: boolean
}

function countryLabel(c: Country) {
  return POPULAR_LABELS[c.slug] ?? c.name
}

export default function LocationPicker({ onSelected, showRadius = true }: Props) {
  const loc = useLocation()
  const [country, setCountry] = useState(() => guessCountryFromCity(loc.citySlug ?? ''))

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })

  const { data: cities } = useQuery({
    queryKey: ['cities', country],
    queryFn: () => catalogApi.citiesByCountry(country),
    enabled: Boolean(country),
  })

  const countryItems = countries?.items ?? []

  const popularCountries = useMemo(
    () =>
      POPULAR_COUNTRY_SLUGS.map((slug) => countryItems.find((c) => c.slug === slug)).filter(
        (c): c is Country => Boolean(c),
      ),
    [countryItems],
  )

  const otherCountries = useMemo(() => {
    const popular = new Set(POPULAR_COUNTRY_SLUGS)
    return countryItems.filter((c) => !popular.has(c.slug as (typeof POPULAR_COUNTRY_SLUGS)[number]))
  }, [countryItems])

  useEffect(() => {
    if (loc.citySlug) {
      const guessed = guessCountryFromCity(loc.citySlug)
      if (guessed) setCountry(guessed)
    }
  }, [loc.citySlug])

  const pickCountry = (slug: string) => {
    if (slug !== country) {
      loc.clearCity()
    }
    setCountry(slug)
  }

  const pickCity = (slug: string) => {
    if (!slug) return
    const city = cities?.items.find((c) => c.slug === slug)
    if (!city) return
    loc.setCity({
      id: city.id,
      slug: city.slug,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    })
    onSelected?.()
  }

  const detect = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        loc.setCoords(pos.coords.latitude, pos.coords.longitude)
        try {
          const city = await discoverApi.reverseGeo(pos.coords.latitude, pos.coords.longitude)
          const guessedCountry = guessCountryFromCity(city.slug)
          if (guessedCountry) setCountry(guessedCountry)
          loc.setCity({
            id: city.id,
            slug: city.slug,
            name: city.name,
            latitude: city.latitude ?? pos.coords.latitude,
            longitude: city.longitude ?? pos.coords.longitude,
          })
        } catch {
          /* coords only */
        }
        onSelected?.()
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const selectedCountry = countryItems.find((c) => c.slug === country)
  const cityItems = cities?.items ?? []

  return (
    <div className="location-panel space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal">Локація</p>
          <h2 className="mt-1 font-display text-lg font-medium uppercase text-ink md:text-xl">
            Де ви шукаєте?
          </h2>
          {loc.hasLocation && loc.cityName && (
            <p className="mt-1 text-sm text-muted">
              Зараз: <span className="font-medium text-ink">{loc.cityName}</span>
              {selectedCountry ? ` · ${countryLabel(selectedCountry)}` : ''}
            </p>
          )}
        </div>
        <button type="button" className="btn-accent shrink-0" onClick={detect}>
          📍 Поруч зі мною
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="form-field-label">Країна</span>
          <div className="relative">
            <select
              className="input appearance-none pr-10"
              value={country}
              onChange={(e) => pickCountry(e.target.value)}
            >
              <option value="" disabled>
                Оберіть країну
              </option>
              {popularCountries.length > 0 && (
                <optgroup label="Популярні">
                  {popularCountries.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {countryLabel(c)}
                    </option>
                  ))}
                </optgroup>
              )}
              {otherCountries.length > 0 && (
                <optgroup label="Інші країни">
                  {otherCountries.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted" aria-hidden>
              ▾
            </span>
          </div>
        </label>

        <label className="block space-y-2">
          <span className="form-field-label">Місто</span>
          <div className="relative">
            <select
              className="input appearance-none pr-10 disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-muted"
              value={loc.citySlug ?? ''}
              disabled={!country}
              onChange={(e) => pickCity(e.target.value)}
            >
              <option value="" disabled>
                {country ? 'Оберіть місто' : 'Спочатку оберіть країну'}
              </option>
              {cityItems.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted" aria-hidden>
              ▾
            </span>
          </div>
        </label>
      </div>

      {showRadius && loc.hasLocation && (
        <div className="space-y-2 border-t border-divider pt-4">
          <span className="form-field-label">Радіус пошуку</span>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  loc.radiusKm === km
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-sand-100 text-ink hover:bg-sand-200'
                }`}
                onClick={() => loc.setRadius(km)}
              >
                {km} км
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function guessCountryFromCity(citySlug: string): string {
  const map: Record<string, string> = {
    berlin: 'de',
    munich: 'de',
    hamburg: 'de',
    cologne: 'de',
    frankfurt: 'de',
    dresden: 'de',
    nuremberg: 'de',
    heidelberg: 'de',
    warsaw: 'pl',
    krakow: 'pl',
    prague: 'czechia',
    vienna: 'at',
  }
  return map[citySlug] ?? ''
}
