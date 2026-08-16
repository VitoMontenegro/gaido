export type ServiceCategory = {
  id: number
  slug: string
  name: string
  icon?: string
  sort_order: number
}

export type DiscoverOffering = {
  id: number
  title: string
  slug: string
  description: string
  formats: string[]
  languages: string[]
  has_availability: boolean
  rating_avg: number
  rating_count: number
  category_name: string
  category_slug: string
  service_name: string
  city_name: string
  point_label: string
  point_district: string
  distance_km?: number | null
  has_verified_docs: boolean
  contacts_unlocked: boolean
  provider: {
    id: number
    display_name: string
    business_name: string
    website_slug: string
    avatar_url?: string
    response_hours: string
    status: string
    rating_avg: number
    rating_count: number
  }
}

export type DiscoverMapPoint = {
  point_id: number
  offering_id: number
  provider_id: number
  title: string
  label: string
  city_name: string
  provider_name: string
  provider_slug: string
  category_name: string
  lat: number
  lng: number
  category: string
}

export type PublicProvider = {
  id: number
  display_name: string
  business_name: string
  profession: string
  about: string
  website_slug: string
  avatar_url?: string
  rating_avg: number
  rating_count: number
  response_hours: string
  status: string
  languages: string[]
  has_verified_docs: boolean
  contacts_unlocked: boolean
  phone?: string
  email?: string
  telegram?: string
  whatsapp?: string
  viber?: string
  instagram?: string
  facebook?: string
  website?: string
  offerings: Array<{
    id: number
    title: string
    slug: string
    description: string
    formats: string[]
    languages: string[]
    rating_avg: number
    rating_count: number
  }>
  points: Array<{
    id: number
    label: string
    district?: string
    latitude: number
    longitude: number
    hours_text?: string
  }>
}

export type JobItem = {
  id: number
  title: string
  company: string
  description: string
  requirements: string
  schedule_text: string
  salary_text: string
  language: string
  employment_type: string
  contact_text?: string
  contact_url?: string
}

export type LookingRequestItem = {
  id: number
  title: string
  description: string
  formats: string[]
  languages: string[]
  status: string
  created_at: string
}

export type LocationState = {
  cityId?: number
  citySlug?: string
  cityName?: string
  regionId?: number
  lat?: number
  lng?: number
  radiusKm: number
}

export const RADIUS_OPTIONS = [5, 10, 20, 30, 50] as const

export const FORMAT_LABELS: Record<string, string> = {
  on_site: 'На місці',
  mobile: 'З виїздом',
  online: 'Онлайн',
}

export const RESPONSE_LABELS: Record<string, string> = {
  under_30m: 'до 30 хвилин',
  under_1h: 'до 1 години',
  few_hours: 'протягом кількох годин',
  within_24h: 'протягом 24 годин',
  '1_2_days': '1–2 днів',
}

export const LANG_LABELS: Record<string, string> = {
  uk: 'Українська',
  de: 'Deutsch',
  en: 'English',
  pl: 'Polski',
}
