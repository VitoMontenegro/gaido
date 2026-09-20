import { api } from './http'

export type PlaceType = 'country' | 'city'

export type PlaceFAQ = {
  question: string
  answer: string
}

export type PlacePage = {
  place_type: PlaceType
  place_id: number
  slug: string
  name: string
  country_name?: string
  country_slug?: string
  public_path: string
  excerpt: string
  intro_html: string
  seo_title: string
  seo_description: string
  seo_image_url: string
  faq: PlaceFAQ[]
}

export type PlacePageListItem = {
  place_type: PlaceType
  place_id: number
  slug: string
  name: string
  country_name?: string
  public_path: string
  has_content: boolean
}

export type PlacePageInput = {
  excerpt: string
  intro_html: string
  seo_title: string
  seo_description: string
  seo_image_url: string
  faq: PlaceFAQ[]
}

export const placePagesApi = {
  public: (type: PlaceType, slug: string) =>
    api<PlacePage>(`/api/v1/place-pages/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`),
  admin: {
    list: () => api<{ items: PlacePageListItem[] }>('/api/v1/admin/place-pages'),
    get: (type: PlaceType, id: number) =>
      api<PlacePage>(`/api/v1/admin/place-pages/${type}/${id}`),
    save: (type: PlaceType, id: number, body: PlacePageInput) =>
      api<PlacePage>(`/api/v1/admin/place-pages/${type}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: (type: PlaceType, id: number) =>
      api<{ status: string }>(`/api/v1/admin/place-pages/${type}/${id}`, { method: 'DELETE' }),
  },
}
