import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import type { CountryCatalogCity, CountryCatalogItem, MapPoint } from '@gaido/api-client/api/types/catalog'
import { cn } from '@gaido/ui-primitives/cn'
import CitiesMap from '../CitiesMap'
import {
  REGION_OPTIONS,
  UK_ALPHABET,
  countryCca2,
  countryContinent,
  countryFirstLetter,
  type RegionId,
} from '../../lib/countryMeta'
import { PlaceExcerpt } from '../PlacePageBlocks'
import { SEO_COUNTRIES_DESCRIPTION, SEO_COUNTRIES_HEADING } from '../../lib/seoTemplates'

type Props = {
  points: MapPoint[]
  countries: CountryCatalogItem[]
  loading: boolean
  heading?: string
  excerpt?: string
  variant?: 'page' | 'home'
}

function ukPlural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? few
        : many
  return `${count} ${word}`
}

function placeStats(cityCount: number, excursionCount: number) {
  const parts = [ukPlural(cityCount, 'місто', 'міста', 'міст')]
  if (excursionCount > 0) parts.push(ukPlural(excursionCount, 'екскурсія', 'екскурсії', 'екскурсій'))
  return parts.join(' · ')
}

function inRegion(slug: string, region: RegionId) {
  if (region === 'all') return true
  return countryContinent(slug) === region
}

function scrollToCountries() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('countries-list')?.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
    block: 'start',
  })
}

function CountryFlag({ slug, name, large = false }: { slug: string; name: string; large?: boolean }) {
  const code = countryCca2(slug)
  if (code) {
    return (
      <img
        src={`/flags/${code}.svg`}
        alt=""
        width={large ? 36 : 20}
        height={large ? 27 : 15}
        className={cn('countries-flag', large && 'countries-flag-lg')}
        title={name}
        draggable={false}
      />
    )
  }
  const letter = name.trim().charAt(0).toLocaleUpperCase('uk')
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-medium text-ink"
      aria-hidden
    >
      {letter}
    </span>
  )
}

function SearchField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{placeholder}</span>
      <MagnifyingGlassIcon
        className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted-light"
        aria-hidden
      />
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn('input', 'pl-11')}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
      />
    </label>
  )
}

function RegionSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: RegionId
  onChange: (value: RegionId) => void
}) {
  return (
    <label className="relative block sm:w-56">
      <span className="sr-only">Регіон</span>
      <select
        id={id}
        className="countries-region-select input"
        value={value}
        onChange={(event) => onChange(event.target.value as RegionId)}
      >
        <option value="all">Усі регіони</option>
        {REGION_OPTIONS.filter((option) => option.id !== 'all').map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </label>
  )
}

function CoverImage({ src, alt }: { src?: string; alt: string }) {
  const url = src ? resolveMediaUrl(src) : ''
  if (!url) return null
  return <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
}

export default function CountriesDirectory({
  points,
  countries,
  loading,
  heading,
  excerpt,
  variant = 'page',
}: Props) {
  const isHome = variant === 'home'
  const pageHeading = (heading ?? '').trim() || SEO_COUNTRIES_HEADING
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<RegionId>('all')
  const [letter, setLetter] = useState<string | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase('uk')

  const regional = useMemo(
    () => countries.filter((country) => inRegion(country.slug, region)),
    [countries, region],
  )

  const searched = useMemo(() => {
    if (!normalizedQuery) return regional
    return regional.filter((country) => {
      if (country.name.toLocaleLowerCase('uk').includes(normalizedQuery)) return true
      return country.cities.some((city) => city.name.toLocaleLowerCase('uk').includes(normalizedQuery))
    })
  }, [regional, normalizedQuery])

  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    for (const country of searched) {
      const first = countryFirstLetter(country.name)
      if (first) letters.add(first)
    }
    return letters
  }, [searched])

  const activeLetter = letter && availableLetters.has(letter) ? letter : null
  const visibleCountries = activeLetter
    ? searched.filter((country) => countryFirstLetter(country.name) === activeLetter)
    : searched

  const popularCountries = useMemo(() => {
    return [...searched]
      .sort(
        (a, b) =>
          b.excursion_count - a.excursion_count ||
          b.city_count - a.city_count ||
          a.name.localeCompare(b.name, 'uk'),
      )
      .slice(0, 8)
  }, [searched])

  const popularCities = useMemo(() => {
    return regional
      .flatMap((country) =>
        country.cities.map((city) => ({
          ...city,
          cover_image_url: city.cover_image_url || country.cover_image_url,
          countryName: country.name,
          countrySlug: country.slug,
        })),
      )
      .sort(
        (a, b) => b.excursion_count - a.excursion_count || a.name.localeCompare(b.name, 'uk'),
      )
      .slice(0, 12)
  }, [regional])

  const mapPoints = useMemo(() => {
    return points.filter((point) => {
      if (!inRegion(point.country_slug, region)) return false
      if (!normalizedQuery) return true
      const countryName = (point.country_name || '').toLocaleLowerCase('uk')
      return countryName.includes(normalizedQuery) || point.name.toLocaleLowerCase('uk').includes(normalizedQuery)
    })
  }, [points, region, normalizedQuery])

  const countriesList = (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="countries-list-title" className={isHome ? 'section-title' : 'section-title'}>
          Усі країни
        </h2>
        <p className="text-sm text-muted">{ukPlural(visibleCountries.length, 'країна', 'країни', 'країн')}</p>
      </div>

      <form
        role="search"
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => event.preventDefault()}
      >
        <SearchField
          id={isHome ? 'home-countries-search' : 'countries-list-search'}
          value={query}
          placeholder="Країна, місто або напрямок..."
          onChange={setQuery}
        />
        <RegionSelect id={isHome ? 'home-countries-region' : 'countries-list-region'} value={region} onChange={setRegion} />
      </form>

      <nav aria-label="Алфавіт" className="mt-4 -mx-5 min-w-0 overflow-x-auto px-5 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-1">
          <li>
            <button
              type="button"
              aria-pressed={!activeLetter}
              className={cn(
                'min-h-8 rounded-lg px-2.5 text-sm font-medium transition',
                !activeLetter ? 'bg-teal text-white' : 'text-ink hover:bg-sand-100',
              )}
              onClick={() => setLetter(null)}
            >
              Усі
            </button>
          </li>
          {UK_ALPHABET.map((char) => {
            const enabled = availableLetters.has(char)
            const pressed = activeLetter === char
            return (
              <li key={char}>
                <button
                  type="button"
                  disabled={!enabled}
                  aria-pressed={pressed}
                  className={cn(
                    'min-h-8 min-w-7 rounded-md px-1 text-sm font-medium transition',
                    pressed && 'bg-teal/10 text-teal',
                    enabled && !pressed && 'text-ink hover:text-teal',
                    !enabled && 'cursor-default text-muted-light',
                  )}
                  onClick={() => setLetter((current) => (current === char ? null : char))}
                >
                  {char}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {visibleCountries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Нічого не знайдено. Спробуйте іншу назву або регіон.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleCountries.map((country) => {
            const matchedCities = normalizedQuery
              ? country.cities.filter((city) => city.name.toLocaleLowerCase('uk').includes(normalizedQuery))
              : []
            return (
              <li key={country.slug}>
                <CountryCard country={country} cities={matchedCities} />
              </li>
            )
          })}
        </ul>
      )}
    </>
  )

  const popularCitiesSidebar =
    popularCities.length > 0 ? (
      <aside className={cn('min-h-0', isHome ? 'hidden lg:block mt-13.75' : 'mt-12 lg:mt-0')}>
        <h2 className="section-title-sm mb-4 flex items-center gap-2">
          <span className="text-teal" aria-hidden>◎</span>
          Популярні міста
        </h2>
        <ul className="card divide-y divide-divider overflow-hidden p-0">
          {popularCities.slice(0, 8).map((city) => (
            <li key={`${city.countrySlug}-${city.slug}`}>
              <Link
                to={`/city/${city.slug}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-sand-50"
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-100">
                  {city.cover_image_url ? (
                    <img
                      src={resolveMediaUrl(city.cover_image_url)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <CountryFlag slug={city.countrySlug} name={city.countryName} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{city.name}</span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-light" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    ) : null

  return (
    <div>
      {!isHome && (
        <>
          <h1 className="font-display text-3xl font-medium leading-tight sm:text-4xl">{pageHeading}</h1>
          <PlaceExcerpt value={excerpt} fallback={SEO_COUNTRIES_DESCRIPTION} />

          <div role="radiogroup" aria-label="Регіон" className="mt-6 flex flex-wrap gap-2">
            {REGION_OPTIONS.map((option) => {
              const active = region === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium transition',
                    active ? 'bg-teal text-white' : 'bg-surface text-ink hover:bg-sand-100',
                  )}
                  onClick={() => setRegion(option.id)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {loading ? (
        <div className="mt-6 min-h-80 animate-pulse rounded-3xl bg-sand-100" aria-label="Завантаження напрямків" />
      ) : countries.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Поки немає країн з опублікованими екскурсіями.</p>
      ) : (
        <>
          {!isHome && (
          <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
            <div className="countries-map relative">
              <CitiesMap points={mapPoints} showAttribution={false} />
              <button
                type="button"
                className="btn-secondary absolute bottom-4 left-4 z-10 shadow-md"
                onClick={scrollToCountries}
              >
                Показати список країн
              </button>
            </div>
            {popularCountries.length > 0 && (
              <aside className="countries-aside hidden min-h-0 lg:flex lg:flex-col">
                <h2 className="section-title-mini mb-2 shrink-0">Популярні напрямки</h2>
                <ul className={cn('card countries-destinations', 'min-h-0 flex-1 divide-y divide-divider overflow-y-auto p-0')}>
                  {popularCountries.map((country) => (
                    <li key={country.slug}>
                      <CountryRow country={country} />
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </section>
          )}

          {!isHome && popularCountries.length > 0 && (
            <section className="mt-8 lg:hidden" aria-label="Популярні напрямки">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="section-title-sm">Популярні напрямки</h2>
                <button type="button" className="link-accent text-sm normal-case" onClick={scrollToCountries}>
                  Дивитись усі
                </button>
              </div>
              <div className="countries-cities -mx-5 px-5 md:mx-0 md:px-0">
                <ul className="flex gap-3">
                  {popularCountries.map((country) => (
                    <li key={country.slug} className="w-[168px] shrink-0 sm:w-[200px]">
                      <Link
                        to={`/countries/${country.slug}`}
                        className="countries-city-card relative block overflow-hidden rounded-2xl bg-sand-100"
                      >
                        <CoverImage src={country.cover_image_url} alt={country.name} />
                        {country.cover_image_url ? (
                          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/75 to-transparent p-3">
                            <span className="block truncate font-medium text-white">{country.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-white/80">
                              {placeStats(country.city_count, country.excursion_count)}
                            </span>
                          </span>
                        ) : (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                            <CountryFlag slug={country.slug} name={country.name} large />
                            <span className="font-medium text-ink">{country.name}</span>
                            <span className="text-xs text-muted">
                              {placeStats(country.city_count, country.excursion_count)}
                            </span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section
            id="countries-list"
            className={cn('scroll-mt-28', isHome ? 'mt-0' : 'mt-10')}
            aria-labelledby="countries-list-title"
          >
            {isHome ? (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                <div className="min-w-0">{countriesList}</div>
                {popularCitiesSidebar}
              </div>
            ) : (
              countriesList
            )}
          </section>

          {!isHome && popularCities.length > 0 && (
            <section className="mt-12 lg:hidden" aria-labelledby="popular-cities-title">
              <div className="mb-4 flex items-baseline gap-3">
                <h2 id="popular-cities-title" className="section-title">
                  Популярні міста
                </h2>
                <p className="text-sm font-normal normal-case text-muted">
                  {ukPlural(popularCities.length, 'місто', 'міста', 'міст')}
                </p>
              </div>
              <div className="countries-cities -mx-5 px-5 md:mx-0 md:px-0">
                <ul className="flex gap-3">
                  {popularCities.map((city) => (
                    <li key={`${city.countrySlug}-${city.slug}`} className="w-[168px] shrink-0 sm:w-[200px]">
                      <Link
                        to={`/city/${city.slug}`}
                        className="countries-city-card group relative block overflow-hidden rounded-2xl bg-sand-100"
                      >
                        <CoverImage src={city.cover_image_url} alt={city.name} />
                        {city.cover_image_url ? (
                          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/75 to-transparent p-3">
                            <span className="block font-display text-sm font-medium text-white uppercase">
                              {city.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-white/80">{city.countryName}</span>
                          </span>
                        ) : (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                            <CountryFlag slug={city.countrySlug} name={city.countryName} large />
                            <span className="font-medium text-ink">{city.name}</span>
                            <span className="text-xs text-muted">{city.countryName}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {isHome && popularCities.length > 0 && (
            <section className="mt-10 lg:hidden" aria-labelledby="popular-cities-title-mobile">
              <h2 id="popular-cities-title-mobile" className="section-title-sm mb-4">Популярні міста</h2>
              <div className="countries-cities -mx-5 px-5 md:mx-0 md:px-0">
                <ul className="flex gap-3">
                  {popularCities.map((city) => (
                    <li key={`${city.countrySlug}-${city.slug}`} className="w-[168px] shrink-0 sm:w-[200px]">
                      <Link
                        to={`/city/${city.slug}`}
                        className="countries-city-card group relative block overflow-hidden rounded-2xl bg-sand-100"
                      >
                        <CoverImage src={city.cover_image_url} alt={city.name} />
                        <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/75 to-transparent p-3">
                          <span className="block text-sm font-medium text-white">{city.name}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {!isHome && (
          <section className="mt-12 overflow-hidden rounded-3xl bg-surface px-6 py-8 md:flex md:items-center md:justify-between md:gap-8 md:px-10">
            <div>
              <h2 className="section-title-sm">Шукаєте україномовного гіда?</h2>
              <p className="mt-2 max-w-xl text-base text-muted">
                Оберіть країну або місто — і перегляньте доступні екскурсії та профіль гіда
              </p>
            </div>
            <Link to="/guides" className="btn-accent mt-5 shrink-0 md:mt-0">
              Знайти гіда
            </Link>
          </section>
          )}
        </>
      )}
    </div>
  )
}

function CountryRow({ country }: { country: CountryCatalogItem }) {
  return (
    <Link
      to={`/countries/${country.slug}`}
      className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-sand-50"
    >
      <CountryFlag slug={country.slug} name={country.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{country.name}</span>
        <span className="mt-0.5 block text-sm text-muted">
          {placeStats(country.city_count, country.excursion_count)}
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-light" aria-hidden />
    </Link>
  )
}

function CountryCard({ country, cities }: { country: CountryCatalogItem; cities: CountryCatalogCity[] }) {
  return (
    <article className="h-full overflow-hidden rounded-2xl border border-divider bg-white shadow-[0_1px_3px_rgba(15,26,40,0.06)]">
      <Link
        to={`/countries/${country.slug}`}
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-sand-50"
      >
        <CountryFlag slug={country.slug} name={country.name} />
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{country.name}</span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-light" aria-hidden />
      </Link>
      {cities.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-3">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link
                to={`/city/${city.slug}`}
                className="text-sm text-stone-700 transition hover:text-brand-700 hover:underline"
              >
                {city.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
