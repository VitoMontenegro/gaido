export type TransportStop = {
  id?: number
  city_id: number
  city_name?: string
  city_slug?: string
  country_name?: string
  sort_order: number
}

export type TransportDeparture = {
  id?: number
  depart_on: string
  arrive_on?: string
  seats_left?: number | null
}

export type TransportListing = {
  id: number
  provider_id: number
  kind: 'regular' | 'occasional'
  company_name: string
  driver_names: string
  vehicle_brand: string
  vehicle_photo_url?: string
  phone?: string
  email?: string
  telegram?: string
  whatsapp?: string
  viber?: string
  price_amount: number
  price_currency: string
  seats_total: number
  parcels_accepted: boolean
  parcels_terms?: string
  depart_time: string
  arrive_time_approx?: string
  status: string
  provider_name?: string
  provider_slug?: string
  contacts_unlocked: boolean
  subscription_active?: boolean
  logged_in?: boolean
  carrier_type?: string
  verified_ukrainian?: boolean
  description?: string
  seats_available?: number
  bookings_count?: number
  stops: TransportStop[]
  departures: TransportDeparture[]
}

export type TransportListingInput = {
  kind: 'regular' | 'occasional'
  company_name?: string
  driver_names: string
  vehicle_brand: string
  vehicle_photo_url?: string
  phone?: string
  email?: string
  telegram?: string
  whatsapp?: string
  viber?: string
  price_amount: number
  price_currency?: string
  seats_total: number
  parcels_accepted: boolean
  parcels_terms?: string
  depart_time: string
  arrive_time_approx?: string
  status?: string
  stops: Array<{ city_id: number; sort_order: number }>
  departures: TransportDeparture[]
  provider_slug?: string
  provider_name?: string
}
