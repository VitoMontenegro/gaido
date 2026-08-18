import { api } from './http'
import { buildUploadForm, type UploadFile } from './upload'
import type { ReviewListResponse, ReviewPhotoListResponse } from './types/reviews'

const PAGE_SIZE = 10

export const reviewsApi = {
  list: (params: { excursion_id?: number; guide_id?: number; limit?: number; offset?: number }) => {
    const q = new URLSearchParams()
    if (params.excursion_id) q.set('excursion_id', String(params.excursion_id))
    if (params.guide_id) q.set('guide_id', String(params.guide_id))
    q.set('limit', String(params.limit ?? PAGE_SIZE))
    q.set('offset', String(params.offset ?? 0))
    return api<ReviewListResponse>(`/api/v1/reviews?${q}`)
  },

  listPhotos: (params: { excursion_id?: number; guide_id?: number; limit?: number; offset?: number }) => {
    const q = new URLSearchParams()
    if (params.excursion_id) q.set('excursion_id', String(params.excursion_id))
    if (params.guide_id) q.set('guide_id', String(params.guide_id))
    q.set('limit', String(params.limit ?? PAGE_SIZE))
    q.set('offset', String(params.offset ?? 0))
    return api<ReviewPhotoListResponse>(`/api/v1/reviews/photos?${q}`)
  },

  uploadPhoto: (file: File | UploadFile) =>
    api<{ public_key: string }>('/api/v1/reviews/photos', { method: 'POST', body: buildUploadForm(file) }),

  create: (body: { excursion_id: number; rating: number; text: string; photos?: string[] }) =>
    api('/api/v1/reviews', { method: 'POST', body: JSON.stringify(body) }),

  addComment: (reviewId: number, text: string) =>
    api(`/api/v1/reviews/${reviewId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),

  dispute: (reviewId: number, text: string) =>
    api(`/api/v1/reviews/${reviewId}/dispute`, { method: 'POST', body: JSON.stringify({ text }) }),
}

export const favoritesApi = {
  list: () => api<{ items: import('./types/catalog').FavoriteItem[] }>('/api/v1/favorites'),
  toggle: (body: { target_type: string; target_id: number }) =>
    api<{ favorited: boolean }>('/api/v1/favorites', { method: 'POST', body: JSON.stringify(body) }),
}

export { PAGE_SIZE as REVIEWS_PAGE_SIZE }
