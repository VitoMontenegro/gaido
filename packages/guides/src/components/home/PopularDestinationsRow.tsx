import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import type { CountryCatalogItem } from '@gaido/api-client/api/types/catalog'
import { countryCca2 } from '../../lib/countryMeta'

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

function CountryFlag({ slug, name }: { slug: string; name: string }) {
  const code = countryCca2(slug)
  if (!code) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-medium text-white">
        {name.trim().charAt(0).toLocaleUpperCase('uk')}
      </span>
    )
  }
  return (
    <img
      src={`/flags/${code}.svg`}
      alt=""
      width={40}
      height={30}
      className="h-7 w-10 rounded object-cover shadow-sm"
      draggable={false}
    />
  )
}

type Props = {
  countries: CountryCatalogItem[]
  limit?: number
}

export default function PopularDestinationsRow({ countries, limit = 6 }: Props) {
  const items = countries.slice(0, limit)
  if (items.length === 0) return null

  return (
    <div className="guides-home-dest-scroll -mx-5 min-w-0 overflow-x-auto px-5 md:mx-0 md:px-0">
      <ul className="flex gap-4">
        {items.map((country) => {
          const cover = country.cover_image_url ? resolveMediaUrl(country.cover_image_url) : ''
          return (
            <li key={country.slug} className="w-[168px] shrink-0 sm:w-[200px] lg:w-[calc((100%-5rem)/6)] lg:min-w-[160px] lg:shrink">
              <Link
                to={`/countries/${country.slug}`}
                className="guides-home-dest-card group relative block overflow-hidden rounded-2xl bg-sand-100"
              >
                {cover ? (
                  <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center bg-sand-200">
                    <CountryFlag slug={country.slug} name={country.name} />
                  </span>
                )}
                <span className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-medium text-white">{country.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/85">
                      {placeStats(country.city_count, country.excursion_count)}
                    </span>
                  </span>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition group-hover:bg-white"
                    aria-hidden
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
