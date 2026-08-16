import { api } from './http'

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
