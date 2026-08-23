import { api } from './http'

export type TransportBooking = {
  id: number
  listing_id: number
  departure_id?: number
  seats: number
  passenger_name: string
  passenger_phone: string
  passenger_email?: string
  comment?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  depart_on?: string
  listing_title?: string
  price_amount?: number
  price_currency?: string
  provider_name?: string
  provider_slug?: string
  created_at?: string
}

export type TransportBookingInput = {
  listing_id: number
  departure_id?: number
  seats?: number
  passenger_name: string
  passenger_phone: string
  passenger_email?: string
  comment?: string
}

export type TransportCompanion = {
  seats: number
  name: string
  status: string
}

export const transportBookingApi = {
  create: (body: TransportBookingInput) =>
    api<{ id: number; status: string }>('/api/v1/account/transport/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  myBookings: () => api<{ items: TransportBooking[] }>('/api/v1/account/transport/bookings'),
  incoming: () => api<{ items: TransportBooking[] }>('/api/v1/account/transport/bookings/incoming'),
  get: (id: number) => api<TransportBooking>(`/api/v1/account/transport/bookings/${id}`),
  updateStatus: (id: number, status: string) =>
    api<{ status: string }>(`/api/v1/account/transport/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  companions: (listingId: number, departureId?: number) => {
    const q = departureId ? `?departure_id=${departureId}` : ''
    return api<{ items: TransportCompanion[]; seats_taken: number }>(
      `/api/v1/transport/rides/${listingId}/companions${q}`,
    )
  },
}

export const carrierBillingApi = {
  plans: () => api<{ items: Array<{ id: number; code: string; name: string; price: number; currency: string; duration_days: number }> }>(
    '/api/v1/account/carrier/billing/plans',
  ),
  status: () =>
    api<{ payments_enabled: boolean; subscription_active?: boolean; subscription?: { expires_at?: string; plan_name?: string } }>(
      '/api/v1/account/carrier/billing/status',
    ),
  checkout: (planId: number) =>
    api<{ payment_id: number }>('/api/v1/account/carrier/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    }),
  confirm: (paymentId: number, planId: number) =>
    api<{ status: string }>(`/api/v1/account/carrier/billing/confirm/${paymentId}?plan_id=${planId}`, {
      method: 'POST',
    }),
}
