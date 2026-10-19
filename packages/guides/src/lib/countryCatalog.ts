import type { CountryCatalogItem, MapPoint } from '@gaido/api-client/api/types/catalog'

function isCountryCatalog(items: CountryCatalogItem[] | undefined): items is CountryCatalogItem[] {
  if (!items?.length) return false
  const first = items[0]
  return typeof first.city_count === 'number' && Array.isArray(first.cities)
}

function catalogFromPoints(points: MapPoint[]): CountryCatalogItem[] {
  const map = new Map<string, CountryCatalogItem>()
  for (const point of points) {
    let item = map.get(point.country_slug)
    if (!item) {
      item = {
        slug: point.country_slug,
        name: point.country_name || point.country_slug,
        city_count: 0,
        excursion_count: 0,
        cities: [],
      }
      map.set(point.country_slug, item)
    }
    item.cities.push({ slug: point.slug, name: point.name, excursion_count: 0 })
    item.city_count = item.cities.length
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
}

/** Catalog from the API, or the same countries grouped from map points if the catalog is still empty. */
export function resolveCountryCatalog(
  catalog: CountryCatalogItem[] | undefined,
  points: MapPoint[],
  catalogLoading: boolean,
): CountryCatalogItem[] {
  if (isCountryCatalog(catalog)) {
    return catalog.map((item) => ({ ...item, cities: item.cities ?? [] }))
  }
  if (catalogLoading && points.length === 0) return []
  return catalogFromPoints(points)
}
