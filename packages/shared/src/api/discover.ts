import { api } from './http'
import type {
  DiscoverMapPoint,
  DiscoverOffering,
  JobItem,
  LookingRequestItem,
  PublicProvider,
  ServiceCategory,
} from './types/discover'
import type { City } from './types/catalog'

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const discoverApi = {
  discover: (params: Record<string, string | number | undefined>) =>
    api<{ items: DiscoverOffering[]; total: number }>(`/api/v1/discover${qs(params)}`),
  mapPoints: (params: Record<string, string | number | undefined>) =>
    api<{ items: DiscoverMapPoint[] }>(`/api/v1/discover/map-points${qs(params)}`),
  categories: () => api<{ items: ServiceCategory[] }>('/api/v1/categories'),
  categoryServices: (slug: string) =>
    api<{ category: ServiceCategory; items: Array<{ id: number; slug: string; name: string }> }>(
      `/api/v1/categories/${slug}/services`,
    ),
  provider: (slug: string) => api<PublicProvider>(`/api/v1/providers/${slug}`),
  reverseGeo: (lat: number, lng: number) =>
    api<City>(`/api/v1/geo/reverse?lat=${lat}&lng=${lng}`),
  nearbyCities: (cityId: number, radiusKm: number) =>
    api<{ items: City[] }>(`/api/v1/geo/nearby-cities?city_id=${cityId}&radius_km=${radiusKm}`),
  regions: (countrySlug: string) =>
    api<{ items: Array<{ id: number; slug: string; name: string }> }>(
      `/api/v1/geo/countries/${countrySlug}/regions`,
    ),
  jobs: (params: Record<string, string | number | undefined>) =>
    api<{ items: JobItem[]; total: number }>(`/api/v1/jobs${qs(params)}`),
  lookingRequests: (cityId?: number) =>
    api<{ items: LookingRequestItem[] }>(
      `/api/v1/looking-requests${cityId ? `?city_id=${cityId}` : ''}`,
    ),
  createLookingRequest: (body: object) =>
    api<{ id: number }>('/api/v1/looking-requests', { method: 'POST', body: JSON.stringify(body) }),
}

export const providerApi = {
  account: () =>
    api<{ profile: PublicProvider | null; offerings: unknown[]; points: unknown[] }>(
      '/api/v1/account/provider',
    ),
  register: (display_name: string, slug: string) =>
    api<{ id: number }>('/api/v1/account/provider/register', {
      method: 'POST',
      body: JSON.stringify({ display_name, slug }),
    }),
  updateProfile: (body: object) =>
    api('/api/v1/account/provider/profile', { method: 'PUT', body: JSON.stringify(body) }),
  upsertOffering: (body: object) =>
    api<{ id: number }>('/api/v1/account/provider/offerings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  upsertPoint: (body: object) =>
    api<{ id: number }>('/api/v1/account/provider/points', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  linkOfferingPoint: (offering_id: number, point_id: number) =>
    api('/api/v1/account/provider/offering-points', {
      method: 'POST',
      body: JSON.stringify({ offering_id, point_id }),
    }),
  upsertZone: (body: object) =>
    api<{ id: number }>('/api/v1/account/provider/zones', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  suggestService: (body: object) =>
    api<{ id: number; status: string }>('/api/v1/account/provider/service-suggestions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  respondLooking: (id: number, body: object) =>
    api<{ id: number }>(`/api/v1/looking-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createReview: (body: object) =>
    api('/api/v1/platform-reviews', { method: 'POST', body: JSON.stringify(body) }),
}
