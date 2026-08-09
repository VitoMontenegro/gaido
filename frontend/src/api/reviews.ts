import { api } from './http'

export const reviewsApi = {
  create: (body: { excursion_id: number; rating: number; text: string }) =>
    api('/api/v1/reviews', { method: 'POST', body: JSON.stringify(body) }),
  addComment: (reviewId: number, text: string) =>
    api(`/api/v1/reviews/${reviewId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
}

export const favoritesApi = {
  list: () => api<{ items: import('./types/catalog').FavoriteItem[] }>('/api/v1/favorites'),
  toggle: (body: { target_type: string; target_id: number }) =>
    api<{ favorited: boolean }>('/api/v1/favorites', { method: 'POST', body: JSON.stringify(body) }),
}
