import { api } from './http'
import type { GuideDashboard } from './types/catalog'

export const guideApi = {
  dashboard: () => api<GuideDashboard>('/api/v1/account/guide/dashboard'),
  updateProfile: (body: Record<string, unknown>) =>
    api('/api/v1/account/guide/profile', { method: 'PUT', body: JSON.stringify(body) }),
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
