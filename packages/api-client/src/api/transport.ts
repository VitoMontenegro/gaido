import { api } from './http'
import type { TransportListing, TransportListingInput } from './types/transport'

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function buildUploadForm(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return fd
}

export const transportApi = {
  search: (params: Record<string, string | number | undefined>) =>
    api<{ items: TransportListing[]; total: number }>(`/api/v1/transport/rides${qs(params)}`),
  get: (id: number) => api<TransportListing>(`/api/v1/transport/rides/${id}`),
  myRides: () => api<{ items: TransportListing[] }>('/api/v1/account/transport/rides'),
  create: (body: TransportListingInput) =>
    api<{ id: number }>('/api/v1/account/transport/rides', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: number, body: TransportListingInput) =>
    api<{ status: string }>(`/api/v1/account/transport/rides/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    api<{ status: string }>(`/api/v1/account/transport/rides/${id}`, { method: 'DELETE' }),
  uploadPhoto: (file: File) =>
    api<{ public_key: string }>('/api/v1/media', { method: 'POST', body: buildUploadForm(file) }),
}
