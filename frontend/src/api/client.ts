const API_BASE = import.meta.env.VITE_API_URL ?? ''

export type ApiError = {
  error: { code: string; message: string; request_id: string }
}

export class ApiClientError extends Error {
  code: string
  requestId?: string

  constructor(code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.requestId = requestId
  }
}

const API_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Увійдіть в акаунт, щоб виконати цю дію',
  FORBIDDEN: 'Недостатньо прав для цієї дії',
  NOT_FOUND: 'Запитаний ресурс не знайдено',
  VALIDATION: 'Перевірте правильність введених даних',
  VALIDATION_ERROR: 'Перевірте правильність введених даних',
  CONFLICT: 'Такий запис уже існує',
  REVIEW_ALREADY_EXISTS: 'Ви вже залишили відгук на цю екскурсію',
}

export type ApiErrorHints = Partial<Record<string, string>>

export function formatApiError(error: unknown, hints?: string | ApiErrorHints): string {
  if (error instanceof ApiClientError) {
    if (typeof hints === 'string' && error.code === 'UNAUTHORIZED') return hints
    if (hints && typeof hints === 'object' && hints[error.code]) return hints[error.code]!
    return API_ERROR_MESSAGES[error.code] ?? error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Сталася помилка. Спробуйте ще раз.'
}

export function getApiErrorCode(error: unknown): string | undefined {
  return error instanceof ApiClientError ? error.code : undefined
}

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) localStorage.setItem('access_token', token)
  else localStorage.removeItem('access_token')
}

export function loadAccessToken() {
  accessToken = localStorage.getItem('access_token')
  return accessToken
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null
    const code = err?.error?.code ?? 'UNKNOWN'
    const message = err?.error?.message ?? res.statusText
    throw new ApiClientError(code, message, err?.error?.request_id)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const authApi = {
  register: (body: { email: string; login: string; password: string; as_guide?: boolean }) =>
    api<{ access_token: string; roles: string[] }>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { login: string; password: string }) =>
    api<{ access_token: string; roles: string[] }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => api('/api/v1/auth/logout', { method: 'POST' }),
  me: () => api<MeUser>('/api/v1/account/me'),
  updateProfile: (body: { first_name: string; last_name: string }) =>
    api<MeUser>('/api/v1/account/profile', { method: 'PUT', body: JSON.stringify(body) }),
}

export type MeUser = {
  id: number
  login: string
  email: string
  first_name: string
  last_name: string
  roles: string[]
}

export function userDisplayName(me: Pick<MeUser, 'first_name' | 'last_name' | 'login'>): string {
  const name = `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim()
  return name || me.login
}

export const catalogApi = {
  guides: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return api<{ items: PublicGuide[] }>(`/api/v1/guides${q}`)
  },
  topGuides: (limit = 8) =>
    api<{ items: PublicGuide[] }>(`/api/v1/guides/top?limit=${limit}`),
  guide: (slug: string) => api<PublicGuide>(`/api/v1/guides/${slug}`),
  excursions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return api<{ items: Excursion[] }>(`/api/v1/excursions${q}`)
  },
  countries: () => api<{ items: Country[] }>('/api/v1/geo/countries'),
  countriesWithGuides: () =>
    api<{ items: CountryWithGuides[] }>('/api/v1/geo/countries?with_guides=1'),
  cities: () => api<{ items: City[] }>('/api/v1/geo/cities'),
  citiesByCountry: (countrySlug: string) =>
    api<{ items: City[] }>(`/api/v1/geo/countries/${countrySlug}/cities`),
  cityById: (id: number) => api<City>(`/api/v1/geo/cities/id/${id}`),
  createCity: (body: { country_slug: string; name: string }) =>
    api<{ id: number; name: string }>('/api/v1/account/guide/geo/cities', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  mapPoints: () => api<{ items: MapPoint[] }>('/api/v1/map/points'),
  city: (slug: string) => api<City>(`/api/v1/geo/cities/${slug}`),
  site: () => api<SitePayload>('/api/v1/site'),
}

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
  deployInfo: () => api<DeployInfo>('/api/v1/admin/deploy/info'),
  deployStatus: (app: string) =>
    api<DeployStatus>(`/api/v1/admin/deploy/status?app=${encodeURIComponent(app)}`),
  startDeploy: (app: string, confirm: string) =>
    api<{ status: string; app: string; message: string }>('/api/v1/admin/deploy', {
      method: 'POST',
      body: JSON.stringify({ app, confirm }),
    }),
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

export type AdminPaymentRow = {
  id: number
  amount: number
  currency: string
  purpose: string
  status: string
  created_at: string
  payer_name: string
}

export type GuideDashboard = {
  display_name: string
  avatar_url?: string
  website_slug: string
  status: string
  guide_type: string
  catalog_status: string
  rating_avg: number
  rating_count: number
  profile_complete: number
  excursions: { published: number; draft: number; pending: number; total: number }
  slots_upcoming: number
  payments_enabled: boolean
  subscription_expires?: string
  featured_guide_expires?: string
  featured_excursions_count: number
}

export type FavoriteItem = {
  target_type: string
  target_id: number
  title?: string
  slug?: string
  cover_image_url?: string
  city_name?: string
  price_from?: number
  currency?: string
  description?: string
  rating_avg?: number
  rating_count?: number
  avatar_url?: string
}

export const guideApi = {
  dashboard: () => api<GuideDashboard>('/api/v1/account/guide/dashboard'),
}

/** Повний URL зображення: зовнішній URL, шлях або public_key з медіа-сховища */
export function resolveMediaUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url
  const base = API_BASE.replace(/\/$/, '')
  return `${base}/api/v1/media/public/${url}`
}

export type SubscriptionPlan = {
  id: number
  code: string
  name: string
  description: string
  price: number
  currency: string
  duration_days: number
  plan_type: 'GUIDE_PLACEMENT' | 'FEATURED_GUIDE' | 'FEATURED_EXCURSION'
}

export type BillingStatus = {
  payments_enabled: boolean
  subscription?: {
    expires_at?: string
    status: string
  }
  featured_guide?: {
    expires_at: string
  }
  featured_excursions: Array<{
    excursion_id?: number
    excursion_title?: string
    excursion_slug?: string
    expires_at: string
  }>
}

export const billingApi = {
  status: () => api<BillingStatus>('/api/v1/account/guide/billing/status'),
  plans: (type?: string) => {
    const q = type ? `?type=${encodeURIComponent(type)}` : ''
    return api<{ items: SubscriptionPlan[] }>(`/api/v1/account/guide/billing/plans${q}`)
  },
  checkout: (body: { plan_id: number; excursion_id?: number }) =>
    api<{ payment_id: number }>('/api/v1/account/guide/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  confirm: (paymentId: number, planId: number) =>
    api<{ status: string }>(`/api/v1/account/guide/billing/confirm/${paymentId}?plan_id=${planId}`, {
      method: 'POST',
    }),
}

export type Contacts = {
  visible: boolean
  phone?: string
  telegram?: string
  whatsapp?: string
  email?: string
  preferred_contact_method?: string
}

export type PublicGuide = {
  id: number
  slug: string
  display_name: string
  guide_type: string
  type_badge?: string
  about: string
  avatar_url?: string
  rating_avg: number
  rating_count: number
  status: string
  contacts: Contacts
  is_promoted?: boolean
}

export type Excursion = {
  id: number
  guide_id: number
  title: string
  slug: string
  description: string
  type: string
  max_guests: number
  price_from: number
  currency: string
  status: string
  city_name?: string
  guide_name?: string
  guide_slug?: string
}

export type Country = { id: number; slug: string; name: string }
export type CountryWithGuides = Country & { guide_count: number }
export type City = {
  id: number
  slug: string
  name: string
  country_id?: number
  country_slug?: string
  latitude: number
  longitude: number
}
export type MapPoint = {
  id: number
  slug: string
  name: string
  country_slug: string
  country_name?: string
  lat: number
  lng: number
}

export type HomeStat = { value: string; label: string }
export type HomeBenefit = { title: string; text: string }
export type HomeFAQ = { question: string; answer: string }
export type HomeCategoryTile = { label: string; url: string; image_url: string }
export type HomeCta = {
  title: string
  text: string
  schedule: string
  primary_label: string
  primary_url: string
  secondary_label: string
  secondary_url: string
}

export type HomeContent = {
  hero_title: string
  hero_subtitle: string
  category_tiles: HomeCategoryTile[]
  about_image_url: string
  cta: HomeCta
  stats_title: string
  stats: HomeStat[]
  benefits: HomeBenefit[]
  faq: HomeFAQ[]
  featured_guide_slugs: string[]
  featured_excursion_slugs: string[]
  popular_city_slugs: string[]
}

export type FooterLink = { label: string; url: string }
export type FooterColumn = { title: string; links: FooterLink[] }

export type FooterContent = {
  phone: string
  email: string
  telegram: string
  description: string
  columns: FooterColumn[]
  copyright: string
}

export type DestinationCity = { slug: string; name: string }
export type DestinationGroup = {
  country_slug: string
  country_name: string
  cities: DestinationCity[]
}

export type SitePayload = {
  home: {
    content: HomeContent
    featured_guides: PublicGuide[]
    featured_excursions: Excursion[]
    popular_destinations: DestinationGroup[]
  }
  footer: FooterContent
}

export type SiteContentPayload = {
  home: HomeContent
  footer: FooterContent
}
