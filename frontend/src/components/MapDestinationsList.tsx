import { Link } from 'react-router-dom'
import type { MapPoint } from '../api/client'

type CountryGroup = {
  slug: string
  name: string
  cities: MapPoint[]
}

function groupByCountry(points: MapPoint[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>()
  for (const p of points) {
    const key = p.country_slug
    let group = map.get(key)
    if (!group) {
      group = { slug: p.country_slug, name: p.country_name || p.country_slug, cities: [] }
      map.set(key, group)
    }
    group.cities.push(p)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
}

export default function MapDestinationsList({ points }: { points: MapPoint[] }) {
  const groups = groupByCountry(points)
  if (!groups.length) return null

  return (
    <section className="mt-10">
      <h2 className="font-display mb-6 text-2xl font-bold">Напрямки</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((country) => (
          <article key={country.slug} className="card">
            <h3 className="font-semibold text-brand-700">{country.name}</h3>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
              {country.cities.map((city) => (
                <li key={city.id}>
                  <Link
                    to={`/city/${city.slug}`}
                    className="text-sm text-stone-700 transition hover:text-brand-700 hover:underline"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
