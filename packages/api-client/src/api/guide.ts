import { api } from './http'
import type { GuideDashboard } from './types/catalog'

export type GuideCity = {
  id: number
  name: string
  slug: string
  country_slug: string
  is_primary: boolean
}

export type GuideCountry = {
  id: number
  slug: string
  name: string
  is_primary: boolean
}

export const guideApi = {
  dashboard: () => api<GuideDashboard>('/api/v1/account/guide/dashboard'),
  updateProfile: (body: Record<string, unknown>) =>
    api('/api/v1/account/guide/profile', { method: 'PUT', body: JSON.stringify(body) }),
  addCity: (body: { city_id: number; is_primary?: boolean }) =>
    api('/api/v1/account/guide/cities', { method: 'POST', body: JSON.stringify(body) }),
  setCities: (body: { city_ids: number[]; primary_city_id?: number }) =>
    api<{ items: GuideCity[] }>('/api/v1/account/guide/cities', { method: 'PUT', body: JSON.stringify(body) }),
  setCountries: (body: { country_ids: number[]; primary_country_id?: number }) =>
    api<{ items: GuideCountry[] }>('/api/v1/account/guide/countries', { method: 'PUT', body: JSON.stringify(body) }),
  removeCity: (cityId: number) =>
    api(`/api/v1/account/guide/cities/${cityId}`, { method: 'DELETE' }),
  uploadDocument: (formData: FormData) =>
    api('/api/v1/account/guide/documents', { method: 'POST', body: formData }),
  getExcursion: (id: string | number) => api(`/api/v1/account/guide/excursions/${id}`),
  createExcursion: (body: unknown) =>
    api('/api/v1/account/guide/excursions', { method: 'POST', body: JSON.stringify(body) }),
  updateExcursion: (id: number, body: unknown) =>
    api(`/api/v1/account/guide/excursions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  submitExcursion: (id: number) =>
    api(`/api/v1/account/guide/excursions/${id}/submit`, { method: 'POST' }),
  draftExcursion: (id: number) =>
    api(`/api/v1/account/guide/excursions/${id}/draft`, { method: 'POST' }),
  deleteExcursion: (id: number) =>
    api(`/api/v1/account/guide/excursions/${id}`, { method: 'DELETE' }),
  createGeoCity: (body: { country_slug: string; name: string; latitude?: number; longitude?: number }) =>
    api<{ id: number; name: string; created: boolean }>('/api/v1/account/guide/geo/cities', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
