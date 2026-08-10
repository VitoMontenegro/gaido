import { api } from './http'
import type { SiteContentPayload } from './types/site'

export type AdminGuide = {
  id: number
  display_name: string
  slug: string
  status: string
  avatar_url: string
}

export type AdminUser = {
  id: number
  email: string
  login: string
  first_name: string
  last_name: string
  roles: string[]
  status: string
  created_at: string
}

export type AdminExcursion = {
  id: number
  guide_id: number
  guide_name: string
  title: string
  slug: string
  status: string
  price_from: number
  currency: string
}

export type AdminReview = {
  id: number
  guide_id: number
  author_id: number
  author_name?: string
  excursion_id: number
  excursion_title?: string
  rating: number
  text: string
  status: string
}

export type AdminSettings = {
  guide_placement_payments_enabled: boolean
  moderation_enabled: boolean
}

export type AdminPaymentRow = {
  id: number
  amount: number
  currency: string
  purpose: string
  status: string
  created_at: string
  payer_name: string
}

export type AdminAnalytics = {
  active_guides: number
  published_excursions: number
  published_reviews: number
  total_users: number
  total_guides: number
  pending_moderation_excursions: number
  draft_excursions: number
  pending_reviews: number
  total_favorites: number
  payments_total: number
  payments_paid: number
  payments_pending: number
  revenue_total: number
  revenue_month: number
  active_subscriptions: number
  featured_guides_active: number
  featured_excursions_active: number
  cities_count: number
  countries_count: number
  recent_payments: AdminPaymentRow[]
}

export type DeployInfo = {
  enabled: boolean
  app_slug: string
  git_branch: string
}

export type DeployStatus = {
  status: 'idle' | 'running' | 'success' | 'failed'
  running: boolean
  app: string
  enabled: boolean
  branch: string
  commit: string
  commit_message: string
  started_at: string | null
  finished_at: string | null
  exit_code: number
  duration_sec: number
  log_tail: string
  readyz_ok: boolean
}

export const adminApi = {
  analytics: () => api<AdminAnalytics>('/api/v1/admin/analytics'),
  settings: () => api<AdminSettings>('/api/v1/admin/settings'),
  updateSettings: (body: Partial<AdminSettings>) =>
    api<AdminSettings>('/api/v1/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  siteContent: () => api<SiteContentPayload>('/api/v1/admin/site-content'),
  saveSiteContent: (body: SiteContentPayload) =>
    api<SiteContentPayload>('/api/v1/admin/site-content', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  uploadMedia: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api<{ public_key: string }>('/api/v1/media', { method: 'POST', body: fd })
  },
  guides: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : ''
    return api<{ items: AdminGuide[] }>(`/api/v1/admin/guides${q}`)
  },
  updateGuide: (id: number, body: { avatar_url: string }) =>
    api<AdminGuide>(`/api/v1/admin/guides/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGuide: (id: number) =>
    api<{ status: string }>(`/api/v1/admin/guides/${id}`, { method: 'DELETE' }),
  users: () => api<{ items: AdminUser[] }>('/api/v1/admin/users'),
  deleteUser: (id: number) =>
    api<{ status: string }>(`/api/v1/admin/users/${id}`, { method: 'DELETE' }),
  excursions: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : ''
    return api<{ items: AdminExcursion[] }>(`/api/v1/admin/excursions${q}`)
  },
  deleteExcursion: (id: number) =>
    api<{ status: string }>(`/api/v1/admin/excursions/${id}`, { method: 'DELETE' }),
  reviews: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : ''
    return api<{ items: AdminReview[] }>(`/api/v1/admin/reviews${q}`)
  },
  approveExcursion: (id: number) =>
    api(`/api/v1/moderator/excursions/${id}/approve`, { method: 'POST' }),
  rejectExcursion: (id: number) =>
    api(`/api/v1/moderator/excursions/${id}/reject`, { method: 'POST' }),
  approveReview: (id: number) =>
    api(`/api/v1/moderator/reviews/${id}/approve`, { method: 'POST' }),
  createCountry: (body: { slug: string; name: string }) =>
    api<{ id: number }>('/api/v1/moderator/geo/countries', { method: 'POST', body: JSON.stringify(body) }),
  createRegion: (body: { country_id: number; slug: string; name: string }) =>
    api<{ id: number }>('/api/v1/moderator/geo/regions', { method: 'POST', body: JSON.stringify(body) }),
  createCity: (body: { country_id: number; region_id: number; slug: string; name: string; latitude?: number; longitude?: number }) =>
    api<{ id: number }>('/api/v1/moderator/geo/cities', { method: 'POST', body: JSON.stringify(body) }),
  audit: () =>
    api<{ items: { id: number; actor_id?: number; action: string; entity_type: string; entity_id?: number; created_at: string }[] }>(
      '/api/v1/admin/audit',
    ),
  plans: () =>
    api<{ items: { id: number; code: string; name: string; plan_type: string }[] }>('/api/v1/admin/plans'),
  bypassGuide: (id: number, planId: number) =>
    api(`/api/v1/admin/guides/${id}/bypass`, { method: 'POST', body: JSON.stringify({ plan_id: planId }) }),
  approveGuide: (id: number, planId?: number) =>
    api<{ status: string; id: number }>(`/api/v1/admin/guides/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(planId ? { plan_id: planId } : {}),
    }),
  deployInfo: () => api<DeployInfo>('/api/v1/admin/deploy/info'),
  deployStatus: (app: string) =>
    api<DeployStatus>(`/api/v1/admin/deploy/status?app=${encodeURIComponent(app)}`),
  startDeploy: (app: string, confirm: string) =>
    api<{ status: string; app: string; message: string }>('/api/v1/admin/deploy', {
      method: 'POST',
      body: JSON.stringify({ app, confirm }),
    }),
}
