import { api } from './http'

export type ArticleListItem = {
  id: number
  slug: string
  title: string
  excerpt: string
  cover_image_url: string
  published_at?: string
}

export type Article = ArticleListItem & {
  body_html: string
  status: string
  author_id?: number
  created_at?: string
  updated_at?: string
}

type ArticleInput = {
  title: string
  slug?: string
  excerpt?: string
  body_html: string
  cover_image_url?: string
  status?: string
}

function cmsArticlesApi(prefix: '/api/v1/admin' | '/api/v1/moderator') {
  return {
    list: () => api<{ items: Article[] }>(`${prefix}/articles`),
    create: (body: ArticleInput) =>
      api<Article>(`${prefix}/articles`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: ArticleInput) =>
      api<Article>(`${prefix}/articles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: number) => api<{ status: string }>(`${prefix}/articles/${id}`, { method: 'DELETE' }),
  }
}

export const articlesApi = {
  list: (limit = 20) => api<{ items: ArticleListItem[] }>(`/api/v1/articles?limit=${limit}`),
  get: (slug: string) => api<Article>(`/api/v1/articles/${slug}`),
  admin: cmsArticlesApi('/api/v1/admin'),
  moderator: cmsArticlesApi('/api/v1/moderator'),
}
