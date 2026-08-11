export type Contacts = {
  visible: boolean
  phone?: string
  telegram?: string
  whatsapp?: string
  viber?: string
  email?: string
  response_hours?: string
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
