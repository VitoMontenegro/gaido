import { api } from './http'
import type {
  CarrierAccount,
  CarrierProfile,
  CarrierProfileInput,
  CarrierVehicleInput,
} from './types/carrier'

function qs(params: Record<string, string | number | undefined | boolean>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const carrierApi = {
  list: (params: Record<string, string | number | undefined | boolean> = {}) =>
    api<{ items: CarrierProfile[]; total: number }>(`/api/v1/carriers${qs(params)}`),
  get: (slug: string) => api<CarrierProfile>(`/api/v1/carriers/${slug}`),
  account: () => api<CarrierAccount>('/api/v1/account/carrier'),
  saveProfile: (body: CarrierProfileInput) =>
    api<{ status: string }>('/api/v1/account/carrier/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  createVehicle: (body: CarrierVehicleInput) =>
    api<{ id: number }>('/api/v1/account/carrier/vehicles', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateVehicle: (id: number, body: CarrierVehicleInput) =>
    api<{ status: string }>(`/api/v1/account/carrier/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  removeVehicle: (id: number) =>
    api<{ status: string }>(`/api/v1/account/carrier/vehicles/${id}`, { method: 'DELETE' }),
}
