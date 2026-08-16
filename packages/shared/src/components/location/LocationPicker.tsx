import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../../api/catalog'
import type { Country } from '../../api/types/catalog'
import { discoverApi } from '../../api/discover'
import { useLocation } from '../../contexts/LocationContext'

/** Країни з демо-даними та типовими напрямками — швидкий вибір */
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
  'russia',
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
  russia: '🇷🇺 Росія',
}

type Props = {
  onSelected?: () => void
}

function countryLabel(c: Country) {
  return POPULAR_LABELS[c.slug] ?? c.name
}

export default function LocationPicker({ onSelected }: Props) {
  const loc = useLocation()
  const [country, setCountry] = useState(() => guessCountryFromCity(loc.citySlug ?? ''))
  const [countrySearch, setCountrySearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [showAllCountries, setShowAllCountries] = useState(false)

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })

  const activeCountry = country

  const { data: cities } = useQuery({
    queryKey: ['cities', activeCountry],
    queryFn: () => catalogApi.citiesByCountry(activeCountry),
    enabled: Boolean(activeCountry),
  })

  const countryItems = countries?.items ?? []

  const popularCountries = useMemo(
    () =>
      POPULAR_COUNTRY_SLUGS.map((slug) => countryItems.find((c) => c.slug === slug)).filter(
        (c): c is Country => Boolean(c),
      ),
    [countryItems],
  )

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase()
    if (!q) return countryItems
    return countryItems.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        (POPULAR_LABELS[c.slug]?.toLowerCase().includes(q) ?? false),
    )
  }, [countryItems, countrySearch])

  const filteredCities = useMemo(() => {
    const items = cities?.items ?? []
    const q = citySearch.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q))
  }, [cities?.items, citySearch])

  const pickCountry = (slug: string) => {
    setCountry(slug)
    setCountrySearch('')
    setCitySearch('')
    setShowAllCountries(false)
  }

  const pickCity = (slug: string) => {
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

  const selectedCountry = countryItems.find((c) => c.slug === activeCountry)

  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="btn-primary w-full sm:w-auto" onClick={detect}>
        📍 Ваше місцезнаходження
      </button>

      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">Популярні країни</p>
        <div className="flex flex-wrap gap-2">
          {popularCountries.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                activeCountry === c.slug
                  ? 'border-ink bg-ink text-white'
                  : 'border-border bg-surface hover:bg-sand-100'
              }`}
              onClick={() => pickCountry(c.slug)}
            >
              {countryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="text-sm text-brand-700 underline-offset-2 hover:underline"
          onClick={() => setShowAllCountries((v) => !v)}
        >
          {showAllCountries ? 'Сховати пошук країн' : 'Інша країна — знайти в списку…'}
        </button>

        {showAllCountries && (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="Пошук країни (наприклад, Німеччина, Germany, de)…"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
            />
            <ul className="max-h-48 overflow-y-auto rounded-xl border border-border bg-surface">
              {filteredCountries.slice(0, 40).map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    className={`flex w-full px-3 py-2 text-left text-sm hover:bg-sand-100 ${
                      activeCountry === c.slug ? 'bg-sand-100 font-medium' : ''
                    }`}
                    onClick={() => pickCountry(c.slug)}
                  >
                    {countryLabel(c)}
                  </button>
                </li>
              ))}
              {filteredCountries.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">Країну не знайдено</li>
              )}
              {filteredCountries.length > 40 && (
                <li className="px-3 py-2 text-xs text-muted">Уточніть пошук — показано 40 з {filteredCountries.length}</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {activeCountry && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">
            Місто {selectedCountry ? `· ${countryLabel(selectedCountry)}` : ''}
          </p>
          <input
            className="input w-full"
            placeholder="Пошук міста…"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
          />
          <ul className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface">
            {filteredCities.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  className={`flex w-full px-3 py-2 text-left text-sm hover:bg-sand-100 ${
                    loc.citySlug === c.slug ? 'bg-ink text-white hover:bg-ink' : ''
                  }`}
                  onClick={() => pickCity(c.slug)}
                >
                  {c.name}
                </button>
              </li>
            ))}
            {filteredCities.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">Міст не знайдено</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Best-effort для відновлення країни зі збереженого city slug */
function guessCountryFromCity(citySlug: string): string {
  const map: Record<string, string> = {
    berlin: 'de',
    munich: 'de',
    warsaw: 'pl',
    krakow: 'pl',
    prague: 'czechia',
    vienna: 'at',
    moscow: 'russia',
    spb: 'russia',
  }
  return map[citySlug] ?? ''
}
