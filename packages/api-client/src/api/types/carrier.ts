export type CarrierType = 'company' | 'fop' | 'private' | 'individual'

export type CarrierProfile = {
  provider_id: number
  carrier_type: CarrierType
  citizenship: string
  base_city_id?: number
  base_city_name?: string
  base_city_slug?: string
  about?: string
  experience_years: number
  trips_count: number
  trust_level: string
  identity_status: string
  ukrainian_status: string
  business_status: string
  documents_status: string
  hours_text?: string
  contact_person?: string
  status: string
  display_name?: string
  business_name?: string
  website_slug?: string
  avatar_url?: string
  rating_avg?: number
  rating_count?: number
  subscription_active?: boolean
  contacts_unlocked?: boolean
  verified_ukrainian?: boolean
  phone?: string
  email?: string
  telegram?: string
  whatsapp?: string
  viber?: string
  vehicles?: CarrierVehicle[]
  rides?: import('./transport').TransportListing[]
  reviews?: CarrierReview[]
}

export type CarrierVehicle = {
  id: number
  brand: string
  model: string
  year?: number
  vehicle_type: string
  seats: number
  photo_url?: string
  description?: string
  verification_status: string
  is_primary: boolean
}

export type CarrierReview = {
  id: number
  rating: number
  body: string
  author_name?: string
  created_at?: string
}

export type CarrierProfileInput = {
  carrier_type: CarrierType
  citizenship?: string
  base_city_id?: number
  about?: string
  experience_years?: number
  trips_count?: number
  hours_text?: string
  contact_person?: string
  status?: string
  display_name?: string
  business_name?: string
  phone?: string
  email?: string
  telegram?: string
  whatsapp?: string
  viber?: string
}

export type CarrierVehicleInput = {
  brand: string
  model?: string
  year?: number
  vehicle_type?: string
  seats?: number
  photo_url?: string
  description?: string
  is_primary?: boolean
}

export type CarrierAccount = {
  provider_id?: number
  website_slug?: string
  subscription_active?: boolean
  profile?: CarrierProfile | null
  vehicles?: CarrierVehicle[]
}
