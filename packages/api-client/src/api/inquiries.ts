import { api, getAccessToken, getApiBase } from './http'

export type InquiryStatus = 'new' | 'discussing' | 'pending' | 'booked' | 'done' | 'closed' | 'cancelled'

export type Inquiry = {
  id: number
  tourist_user_id: number
  guide_id: number
  excursion_id?: number | null
  status: InquiryStatus
  preferred_date?: string | null
  date_from?: string | null
  date_to?: string | null
  party_size: number
  language: string
  notes: string
  scheduled_at?: string | null
  scheduled_end_at?: string | null
  cancel_reason?: string
  cancelled_by?: string
  help_requested: boolean
  first_guide_reply_at?: string | null
  created_at: string
  updated_at: string
  tourist_name: string
  guide_name: string
  guide_slug?: string
  excursion_title?: string
  excursion_slug?: string
  excursion_duration_minutes?: number
  unread: number
  peer_last_read_id?: number
  last_message_at?: string | null
  last_preview?: string
}

export type InquiryMessage = {
  id: number
  inquiry_id: number
  author_user_id?: number | null
  author_role: 'tourist' | 'guide' | 'admin' | 'system'
  author_name?: string
  kind: 'text' | 'system' | 'attachment' | 'internal_note'
  body: string
  media_key?: string
  created_at: string
}

export type InquiryClient = {
  tourist_user_id: number
  tourist_name: string
  inquiry_count: number
  last_inquiry_at: string
  last_inquiry_id: number
  last_status?: string
}

export type GuideFunnelStats = {
  profile_views: number
  excursion_views: number
  contact_clicks: number
  inquiries: number
  replied: number
  reply_rate: number
  median_reply_minutes?: number | null
  from: string
  to: string
}

export type CreateInquiryBody = {
  guide_id: number
  excursion_id?: number
  preferred_date?: string
  date_from?: string
  date_to?: string
  party_size: number
  language?: string
  notes?: string
}

function qs(status?: string) {
  return status ? `?status=${encodeURIComponent(status)}` : ''
}

export const inquiriesApi = {
  create: (body: CreateInquiryBody) =>
    api<Inquiry>('/api/v1/inquiries', { method: 'POST', body: JSON.stringify(body) }),
  mine: (status?: string) => api<{ items: Inquiry[] }>(`/api/v1/inquiries${qs(status)}`),
  get: (id: number) => api<Inquiry>(`/api/v1/inquiries/${id}`),
  patch: (id: number, body: { status?: InquiryStatus; scheduled_at?: string; scheduled_end_at?: string; cancel_reason?: string }) =>
    api<Inquiry>(`/api/v1/inquiries/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  messages: (id: number, after = 0) =>
    api<{ items: InquiryMessage[]; peer_last_read_id?: number }>(
      `/api/v1/inquiries/${id}/messages?after=${after}`,
    ),
  longpoll: (id: number, after: number, timeout = 25, signal?: AbortSignal) =>
    api<{ items: InquiryMessage[]; peer_last_read_id?: number }>(
      `/api/v1/inquiries/${id}/messages/longpoll?after=${after}&timeout=${timeout}`,
      { signal },
    ),
  send: (id: number, body: string, kind?: 'text' | 'internal_note') =>
    api<InquiryMessage>(`/api/v1/inquiries/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, kind }),
    }),
  help: (id: number) => api(`/api/v1/inquiries/${id}/help`, { method: 'POST' }),
  read: (id: number, last_id: number) =>
    api(`/api/v1/inquiries/${id}/read`, { method: 'POST', body: JSON.stringify({ last_id }) }),
  attach: (id: number, file: File, caption?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    return api<InquiryMessage>(`/api/v1/inquiries/${id}/attachments`, { method: 'POST', body: form })
  },
  guideInbox: (status?: string) =>
    api<{ items: Inquiry[]; counts?: Record<string, number> }>(`/api/v1/account/guide/inquiries${qs(status)}`),
  clients: () => api<{ items: InquiryClient[] }>('/api/v1/account/guide/clients'),
  agenda: (from?: string, to?: string) => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const q = p.toString()
    return api<{ items: Inquiry[] }>(`/api/v1/account/guide/agenda${q ? `?${q}` : ''}`)
  },
  stats: (from?: string, to?: string) => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const q = p.toString()
    return api<GuideFunnelStats>(`/api/v1/account/guide/stats${q ? `?${q}` : ''}`)
  },
  adminList: (queue: 'help' | 'unanswered' | 'open' = 'help') =>
    api<{ items: Inquiry[] }>(`/api/v1/admin/inquiries?queue=${queue}`),
  websocketUrl: (id: number, after = 0) => {
    const token = getAccessToken() ?? ''
    const base = getApiBase() || (typeof window !== 'undefined' ? window.location.origin : '')
    const wsBase = base.replace(/^http/, 'ws')
    const q = new URLSearchParams({ access_token: token, after: String(after) })
    return `${wsBase}/api/v1/inquiries/${id}/ws?${q.toString()}`
  },
}
