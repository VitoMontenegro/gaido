import { api } from './http'
import type { Excursion, PublicGuide } from './types/catalog'
import type { SitePayload } from './types/site'

export const catalogApi = {
  guides: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return api<{ items: PublicGuide[] }>(`/api/v1/guides${q}`)
  },
  topGuides: (limit = 10) =>
    api<{ items: PublicGuide[] }>(`/api/v1/guides/top?limit=${limit}`),
  guide: (slug: string) => api<PublicGuide>(`/api/v1/guides/${slug}`),
  excursions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return api<{ items: Excursion[] }>(`/api/v1/excursions${q}`)
  },
  countries: () => api<{ items: import('./types/catalog').Country[] }>('/api/v1/geo/countries'),
  countriesWithGuides: () =>
    api<{ items: import('./types/catalog').CountryWithGuides[] }>('/api/v1/geo/countries?with_guides=1'),
  cities: () => api<{ items: import('./types/catalog').City[] }>('/api/v1/geo/cities'),
  citiesByCountry: (countrySlug: string) =>
    api<{ items: import('./types/catalog').City[] }>(`/api/v1/geo/countries/${countrySlug}/cities`),
  cityById: (id: number) => api<import('./types/catalog').City>(`/api/v1/geo/cities/id/${id}`),
  mapPoints: () => api<{ items: import('./types/catalog').MapPoint[] }>('/api/v1/map/points'),
  city: (slug: string) => api<import('./types/catalog').City>(`/api/v1/geo/cities/${slug}`),
  site: () => api<SitePayload>('/api/v1/site'),
}
